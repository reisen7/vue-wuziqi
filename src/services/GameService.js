import { ref, reactive } from 'vue';
import { mqttService, topics } from './MQTTService';
import { userService } from './UserService';
import { setMatchingStatus, setGameServiceRef } from './MatchingService';

// 游戏状态枚举
export const GameStatus = {
  IDLE: 'idle',           // 空闲状态
  MATCHING: 'matching',   // 正在匹配
  PLAYING: 'playing',     // 游戏中
  GAME_OVER: 'game_over', // 游戏结束
};

// 棋子类型枚举
export const PieceType = {
  EMPTY: 0,  // 空
  BLACK: 1,  // 黑棋
  WHITE: 2,  // 白棋
};

class GameService {
  constructor() {
    // 游戏状态
    this.status = ref(GameStatus.IDLE);
    
    // 游戏房间信息
    this.room = reactive({
      roomId: null,
      players: [],
      currentTurn: null,
      winner: null,
      startTime: null,
      lastMoveTime: null,
    });
    
    // 棋盘状态 (15x15)
    this.boardSize = 15;
    this.board = ref(Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(PieceType.EMPTY)));
    
    // 当前玩家的棋子类型
    this.myPieceType = ref(null);
    
    // 计时器
    this.turnTimer = ref(30);
    this.timerInterval = null;
    
    // 锁定状态（防止多线程问题）
    this.isLocked = false;
    
    // 匹配超时计时器
    this.matchingTimeoutId = null;
    
    // 设置匹配服务的引用
    setGameServiceRef(this);
  }
  
  // 初始化游戏服务
  init() {
    // MQTT服务已在App.vue中初始化
    console.log('初始化游戏服务');
    
    // 设置匹配服务引用
    setGameServiceRef(this);
  }
  
  // 开始匹配
  startMatching() {
    if (this.status.value !== GameStatus.IDLE) {
      console.warn('当前状态不允许开始匹配');
      return false;
    }
    
    if (this.isLocked) {
      console.warn('操作被锁定，请稍后再试');
      return false;
    }
    
    try {
      this.isLocked = true;
      
      // 更新状态为匹配中
      this.status.value = GameStatus.MATCHING;
      
      // 设置匹配状态
      setMatchingStatus(true);
      
      // 发送匹配请求
      const userInfo = userService.getUserInfo();
      mqttService.publish(topics.GAME_MATCHING, {
        type: 'request_match',
        userId: userInfo.userId,
        username: userInfo.username,
        timestamp: new Date().getTime(),
      });
      
      // 设置匹配超时（30秒）
      this.matchingTimeoutId = setTimeout(() => {
        if (this.status.value === GameStatus.MATCHING) {
          this.cancelMatching();
          console.log('匹配超时');
        }
      }, 30000);
      
      return true;
    } finally {
      this.isLocked = false;
    }
  }
  
  // 取消匹配
  cancelMatching() {
    if (this.status.value !== GameStatus.MATCHING) {
      return false;
    }
    
    // 清除匹配超时计时器
    if (this.matchingTimeoutId) {
      clearTimeout(this.matchingTimeoutId);
      this.matchingTimeoutId = null;
    }
    
    // 设置匹配状态
    setMatchingStatus(false);
    
    // 发送取消匹配请求
    const userInfo = userService.getUserInfo();
    mqttService.publish(topics.GAME_MATCHING, {
      type: 'cancel_match',
      userId: userInfo.userId,
      timestamp: new Date().getTime(),
    });
    
    // 更新状态为空闲
    this.status.value = GameStatus.IDLE;
    
    return true;
  }
  
  // 处理匹配成功
  handleMatchSuccess(roomData) {
    // 清除匹配超时计时器
    if (this.matchingTimeoutId) {
      clearTimeout(this.matchingTimeoutId);
      this.matchingTimeoutId = null;
    }
    
    // 更新房间信息
    this.room.roomId = roomData.roomId;
    this.room.players = roomData.players;
    this.room.currentTurn = roomData.currentTurn;
    this.room.startTime = roomData.startTime;
    this.room.lastMoveTime = roomData.startTime;
    
    // 确定自己的棋子类型
    const myUserId = userService.userId.value;
    const myPlayerInfo = roomData.players.find(player => player.userId === myUserId);
    
    if (myPlayerInfo) {
      this.myPieceType.value = myPlayerInfo.pieceType;
    } else {
      console.error('在房间玩家列表中找不到自己');
      return false;
    }
    
    // 订阅房间主题
    const roomTopic = `${topics.GAME_ROOM}${this.room.roomId}`;
    mqttService.subscribe(roomTopic);
    
    // 重置棋盘
    this.resetBoard();
    
    // 更新状态为游戏中
    this.status.value = GameStatus.PLAYING;
    
    // 启动计时器
    this.startTurnTimer();
    
    return true;
  }
  
  // 重置棋盘
  resetBoard() {
    this.board.value = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(PieceType.EMPTY));
  }
  
  // 下棋
  placePiece(row, col) {
    // 检查是否轮到自己
    const myUserId = userService.userId.value;
    if (this.room.currentTurn !== myUserId) {
      console.warn('当前不是你的回合');
      return false;
    }
    
    // 检查位置是否有效
    if (row < 0 || row >= this.boardSize || col < 0 || col >= this.boardSize) {
      console.warn('无效的位置');
      return false;
    }
    
    // 检查位置是否为空
    if (this.board.value[row][col] !== PieceType.EMPTY) {
      console.warn('该位置已有棋子');
      return false;
    }
    
    // 发送下棋消息
    const roomTopic = `${topics.GAME_ROOM}${this.room.roomId}`;
    mqttService.publish(roomTopic, {
      type: 'place_piece',
      userId: myUserId,
      position: { row, col },
      pieceType: this.myPieceType.value,
      timestamp: new Date().getTime(),
    });
    
    return true;
  }
  
  // 处理对方下棋
  handlePiecePlaced(moveData) {
    const { position, pieceType, userId } = moveData;
    
    // 更新棋盘
    this.board.value[position.row][position.col] = pieceType;
    
    // 更新当前回合
    const nextPlayer = this.room.players.find(player => player.userId !== userId);
    if (nextPlayer) {
      this.room.currentTurn = nextPlayer.userId;
    }
    
    // 更新最后移动时间
    this.room.lastMoveTime = moveData.timestamp;
    
    // 重置计时器
    this.resetTurnTimer();
    
    // 检查是否胜利
    if (this.checkWin(position.row, position.col, pieceType)) {
      this.handleGameOver(userId);
    }
    
    return true;
  }
  
  // 检查是否胜利（五子连珠）
  checkWin(row, col, pieceType) {
    const directions = [
      [1, 0],   // 水平
      [0, 1],   // 垂直
      [1, 1],   // 对角线 /
      [1, -1],  // 对角线 \
    ];
    
    for (const [dx, dy] of directions) {
      let count = 1;  // 当前位置已经有一个棋子
      
      // 正向检查
      for (let i = 1; i <= 4; i++) {
        const newRow = row + i * dx;
        const newCol = col + i * dy;
        
        if (
          newRow < 0 || newRow >= this.boardSize ||
          newCol < 0 || newCol >= this.boardSize ||
          this.board.value[newRow][newCol] !== pieceType
        ) {
          break;
        }
        
        count++;
      }
      
      // 反向检查
      for (let i = 1; i <= 4; i++) {
        const newRow = row - i * dx;
        const newCol = col - i * dy;
        
        if (
          newRow < 0 || newRow >= this.boardSize ||
          newCol < 0 || newCol >= this.boardSize ||
          this.board.value[newRow][newCol] !== pieceType
        ) {
          break;
        }
        
        count++;
      }
      
      // 如果有五子连珠，则胜利
      if (count >= 5) {
        return true;
      }
    }
    
    return false;
  }
  
  // 处理游戏结束
  handleGameOver(winnerId) {
    // 如果已经是游戏结束状态，则不重复处理
    if (this.status.value === GameStatus.GAME_OVER) {
      console.log('游戏已经结束，不重复处理');
      return false;
    }
    
    console.log(`处理游戏结束，获胜者ID: ${winnerId}`);
    
    // 更新游戏状态
    this.status.value = GameStatus.GAME_OVER;
    
    // 更新获胜者
    this.room.winner = winnerId;
    
    // 停止计时器
    this.stopTurnTimer();
    
    // 发送游戏结束消息
    if (this.room.roomId) {
      const roomTopic = `${topics.GAME_ROOM}${this.room.roomId}`;
      console.log(`发送游戏结束消息到主题: ${roomTopic}`);
      
      mqttService.publish(roomTopic, {
        type: 'game_over',
        winnerId: winnerId,
        timestamp: new Date().getTime(),
      });
      
      // 取消订阅房间主题
      setTimeout(() => {
        console.log(`取消订阅房间主题: ${roomTopic}`);
        mqttService.unsubscribe(roomTopic);
      }, 1000);
    } else {
      console.warn('房间ID不存在，无法发送游戏结束消息');
    }
    
    return true;
  }
  
  // 开始新游戏
  startNewGame() {
    console.log('开始新游戏');
    
    // 如果有房间ID，取消订阅房间主题
    if (this.room.roomId) {
      const roomTopic = `${topics.GAME_ROOM}${this.room.roomId}`;
      console.log(`取消订阅房间主题: ${roomTopic}`);
      mqttService.unsubscribe(roomTopic);
    }
    
    // 重置游戏状态
    this.status.value = GameStatus.IDLE;
    
    // 重置房间信息
    this.room.roomId = null;
    this.room.players = [];
    this.room.currentTurn = null;
    this.room.winner = null;
    this.room.startTime = null;
    this.room.lastMoveTime = null;
    
    // 重置棋盘
    this.resetBoard();
    
    // 重置棋子类型
    this.myPieceType.value = null;
    
    // 停止计时器
    this.stopTurnTimer();
    
    console.log('游戏已重置');
    return true;
  }
  
  // 启动回合计时器
  startTurnTimer() {
    this.turnTimer.value = 30;
    
    this.stopTurnTimer();  // 确保之前的计时器已停止
    
    this.timerInterval = setInterval(() => {
      if (this.turnTimer.value > 0) {
        this.turnTimer.value--;
      } else {
        // 时间用完，如果是当前玩家的回合，则判负
        const myUserId = userService.userId.value;
        if (this.room.currentTurn === myUserId) {
          // 找到对手ID
          const opponent = this.room.players.find(player => player.userId !== myUserId);
          if (opponent) {
            this.handleGameOver(opponent.userId);
          }
        }
      }
    }, 1000);
  }
  
  // 重置回合计时器
  resetTurnTimer() {
    this.turnTimer.value = 30;
  }
  
  // 停止回合计时器
  stopTurnTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
  
  // 处理MQTT消息
  handleMQTTMessage(topic, message) {
    console.log(`处理MQTT消息: 主题=${topic}, 类型=${message.type || '未知'}`);
    
    // 如果已经是游戏结束状态，除了match_success消息外，忽略其他消息
    if (this.status.value === GameStatus.GAME_OVER && 
        !(topic === topics.GAME_MATCHING && message.type === 'match_success')) {
      console.log('游戏已结束，忽略消息');
      return;
    }
    
    // 匹配相关消息
    if (topic === topics.GAME_MATCHING) {
      if (message.type === 'match_success') {
        this.handleMatchSuccess(message.room);
      }
    }
    
    // 游戏房间相关消息
    if (topic.startsWith(topics.GAME_ROOM)) {
      switch (message.type) {
        case 'place_piece':
          this.handlePiecePlaced(message);
          break;
        case 'game_over':
          // 避免重复处理游戏结束
          if (this.status.value !== GameStatus.GAME_OVER) {
            this.handleGameOver(message.winnerId);
          } else {
            console.log('已经处于游戏结束状态，忽略game_over消息');
          }
          break;
        case 'player_leave':
          // 处理玩家离开
          if (this.status.value === GameStatus.PLAYING) {
            const opponent = this.room.players.find(player => player.userId !== message.userId);
            if (opponent) {
              this.handleGameOver(opponent.userId);
            }
          } else {
            console.log('不在游戏中状态，忽略player_leave消息');
          }
          break;
        default:
          console.warn(`未知的消息类型: ${message.type}`);
      }
    }
  }
  
  // 离开游戏
  leaveGame() {
    if (this.status.value === GameStatus.PLAYING) {
      // 发送玩家离开消息
      const roomTopic = `${topics.GAME_ROOM}${this.room.roomId}`;
      mqttService.publish(roomTopic, {
        type: 'player_leave',
        userId: userService.userId.value,
        timestamp: new Date().getTime(),
      });
      
      // 取消订阅房间主题
      mqttService.unsubscribe(roomTopic);
    }
    
    // 重置游戏
    this.startNewGame();
    
    return true;
  }
}

// 导出单例
export const gameService = new GameService(); 