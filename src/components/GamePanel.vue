<template>
  <div class="game-panel">
    <!-- 用户信息 -->
    <div class="user-info">
      <div class="avatar">
        <div class="avatar-placeholder" :style="{ backgroundColor: getUserColor(userService.userId.value) }">
          {{ userService.username.value.substring(0, 1) }}
        </div>
      </div>
      <div class="user-details">
        <div class="username">{{ userService.username.value }}</div>
        <div class="user-id">ID: {{ userService.userId.value }}</div>
      </div>
    </div>
    
    <!-- 游戏状态 -->
    <div class="game-status">
      <div class="status-label">游戏状态:</div>
      <div class="status-value" :class="statusClass">{{ statusText }}</div>
    </div>
    
    <!-- 匹配中显示 -->
    <div v-if="gameService.status.value === 'matching'" class="matching-info">
      <div class="spinner"></div>
      <div class="matching-text">正在寻找对手...</div>
      <div class="matching-tip">请稍候，系统正在为您匹配合适的对手</div>
    </div>
    
    <!-- 游戏中显示 -->
    <div v-if="gameService.status.value === 'playing'" class="playing-info">
      <div class="players-info">
        <div class="player-info" v-for="player in gameService.room.players" :key="player.userId">
          <div class="player-name">{{ player.username }}</div>
          <div class="piece-type">
            <div class="piece-indicator" :class="{ 
              'black': player.pieceType === 1, 
              'white': player.pieceType === 2 
            }"></div>
            {{ player.pieceType === 1 ? '黑棋' : '白棋' }}
          </div>
          <div class="current-indicator" v-if="gameService.room.currentTurn === player.userId">
            当前回合
          </div>
        </div>
      </div>
      
      <div class="game-tips">
        <div class="tip-item">
          <i class="tip-icon">💡</i>
          <span>黑棋先行，每回合30秒时间限制</span>
        </div>
        <div class="tip-item">
          <i class="tip-icon">🏆</i>
          <span>五子连珠获胜</span>
        </div>
      </div>
    </div>
    
    <!-- 游戏结束显示 -->
    <div v-if="gameService.status.value === 'game_over'" class="game-over-info">
      <div class="game-result" :class="{ 'win': isWinner, 'lose': !isWinner }">
        {{ gameResult }}
      </div>
      <div class="result-details">
        游戏已结束，您可以点击下方按钮开始新游戏
      </div>
    </div>
    
    <!-- 操作按钮 -->
    <div class="action-buttons">
      <button 
        v-if="gameService.status.value === 'idle'" 
        class="action-button match-button"
        @click="startMatching"
      >
        <i class="button-icon">🔍</i> 搜索对战
      </button>
      
      <button 
        v-if="gameService.status.value === 'matching'" 
        class="action-button cancel-button"
        @click="cancelMatching"
      >
        <i class="button-icon">✖</i> 取消匹配
      </button>
      
      <button 
        v-if="gameService.status.value === 'playing'" 
        class="action-button surrender-button"
        @click="surrender"
      >
        <i class="button-icon">🏳️</i> 认输
      </button>
      
      <button 
        v-if="gameService.status.value === 'game_over'" 
        class="action-button new-game-button"
        @click="newGame"
      >
        <i class="button-icon">🔄</i> 开始新游戏
      </button>
    </div>
    
    <!-- 游戏说明 -->
    <div class="game-instructions" v-if="gameService.status.value === 'idle'">
      <h3>游戏说明</h3>
      <ul>
        <li>点击"搜索对战"开始匹配其他玩家</li>
        <li>匹配成功后，系统会随机分配黑白棋</li>
        <li>黑棋先行，每回合有30秒时间限制</li>
        <li>先将五颗棋子连成一线（横、竖、斜）的玩家获胜</li>
      </ul>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { gameService, GameStatus } from '../services/GameService';
import { userService } from '../services/UserService';

export default {
  name: 'GamePanel',
  setup() {
    // 游戏状态文本
    const statusText = computed(() => {
      switch (gameService.status.value) {
        case GameStatus.IDLE:
          return '等待开始';
        case GameStatus.MATCHING:
          return '正在匹配对手';
        case GameStatus.PLAYING:
          return '游戏进行中';
        case GameStatus.GAME_OVER:
          return '游戏已结束';
        default:
          return '未知状态';
      }
    });
    
    // 游戏状态样式类
    const statusClass = computed(() => {
      switch (gameService.status.value) {
        case GameStatus.IDLE:
          return 'status-idle';
        case GameStatus.MATCHING:
          return 'status-matching';
        case GameStatus.PLAYING:
          return 'status-playing';
        case GameStatus.GAME_OVER:
          return 'status-game-over';
        default:
          return '';
      }
    });
    
    // 游戏结果文本
    const gameResult = computed(() => {
      if (gameService.status.value !== GameStatus.GAME_OVER) {
        return '';
      }
      
      const winnerId = gameService.room.winner;
      const myUserId = userService.userId.value;
      
      if (winnerId === myUserId) {
        return '恭喜你获胜！';
      } else {
        return '很遗憾，你输了！';
      }
    });
    
    // 是否是获胜者
    const isWinner = computed(() => {
      if (gameService.status.value !== GameStatus.GAME_OVER) {
        return false;
      }
      
      return gameService.room.winner === userService.userId.value;
    });
    
    // 根据用户ID生成颜色
    const getUserColor = (userId) => {
      // 简单的哈希算法生成颜色
      let hash = 0;
      for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
      }
      
      const hue = Math.abs(hash % 360);
      return `hsl(${hue}, 70%, 60%)`;
    };
    
    // 开始匹配
    const startMatching = () => {
      gameService.startMatching();
    };
    
    // 取消匹配
    const cancelMatching = () => {
      gameService.cancelMatching();
    };
    
    // 认输
    const surrender = () => {
      // 只有在游戏中状态才能认输
      if (gameService.status.value !== GameStatus.PLAYING) {
        console.warn('当前状态不允许认输');
        return;
      }
      
      // 找到对手ID
      const myUserId = userService.userId.value;
      const opponent = gameService.room.players.find(player => player.userId !== myUserId);
      
      if (opponent) {
        console.log('执行认输操作');
        gameService.handleGameOver(opponent.userId);
      } else {
        console.error('找不到对手信息，无法认输');
      }
    };
    
    // 新游戏
    const newGame = () => {
      gameService.startNewGame();
    };
    
    return {
      gameService,
      userService,
      statusText,
      statusClass,
      gameResult,
      isWinner,
      getUserColor,
      startMatching,
      cancelMatching,
      surrender,
      newGame,
    };
  }
};
</script>

<style scoped>
.game-panel {
  width: 100%;
  max-width: 400px;
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.user-info {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  background-color: #fff;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.avatar {
  margin-right: 15px;
}

.avatar-placeholder {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 24px;
  color: white;
  font-weight: bold;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.username {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 5px;
}

.user-id {
  font-size: 12px;
  color: #666;
  word-break: break-all;
}

.game-status {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  background-color: #fff;
  padding: 12px 15px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.status-label {
  font-weight: bold;
  margin-right: 10px;
}

.status-value {
  font-weight: bold;
}

.status-idle {
  color: #666;
}

.status-matching {
  color: #f39c12;
}

.status-playing {
  color: #2ecc71;
}

.status-game-over {
  color: #e74c3c;
}

.matching-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 20px 0;
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #f39c12;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.matching-text {
  font-size: 16px;
  font-weight: bold;
  color: #f39c12;
  margin-bottom: 8px;
}

.matching-tip {
  font-size: 14px;
  color: #666;
  text-align: center;
}

.playing-info {
  margin: 20px 0;
}

.players-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
}

.player-info {
  padding: 15px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  width: 48%;
}

.player-name {
  font-weight: bold;
  margin-bottom: 8px;
}

.piece-type {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.piece-indicator {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  margin-right: 8px;
}

.piece-indicator.black {
  background-color: #000;
}

.piece-indicator.white {
  background-color: #fff;
  border: 1px solid #000;
}

.current-indicator {
  font-size: 12px;
  color: #2ecc71;
  font-weight: bold;
  padding: 3px 8px;
  background-color: rgba(46, 204, 113, 0.1);
  border-radius: 4px;
  display: inline-block;
}

.game-tips {
  background-color: #fff;
  border-radius: 8px;
  padding: 12px 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.tip-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
  color: #555;
}

.tip-item:last-child {
  margin-bottom: 0;
}

.tip-icon {
  margin-right: 8px;
  font-style: normal;
}

.game-over-info {
  margin: 20px 0;
  text-align: center;
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.game-result {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 10px;
}

.game-result.win {
  color: #2ecc71;
}

.game-result.lose {
  color: #e74c3c;
}

.result-details {
  font-size: 14px;
  color: #666;
}

.action-buttons {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.action-button {
  padding: 12px 24px;
  border: none;
  border-radius: 5px;
  font-weight: bold;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.button-icon {
  margin-right: 8px;
  font-style: normal;
}

.match-button {
  background-color: #3498db;
  color: white;
}

.match-button:hover {
  background-color: #2980b9;
  transform: translateY(-2px);
}

.cancel-button {
  background-color: #e74c3c;
  color: white;
}

.cancel-button:hover {
  background-color: #c0392b;
  transform: translateY(-2px);
}

.surrender-button {
  background-color: #e74c3c;
  color: white;
}

.surrender-button:hover {
  background-color: #c0392b;
  transform: translateY(-2px);
}

.new-game-button {
  background-color: #2ecc71;
  color: white;
}

.new-game-button:hover {
  background-color: #27ae60;
  transform: translateY(-2px);
}

.game-instructions {
  margin-top: 30px;
  background-color: #fff;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.game-instructions h3 {
  font-size: 16px;
  margin-bottom: 10px;
  color: #333;
}

.game-instructions ul {
  padding-left: 20px;
}

.game-instructions li {
  font-size: 14px;
  color: #555;
  margin-bottom: 6px;
}

.game-instructions li:last-child {
  margin-bottom: 0;
}

@media (max-width: 480px) {
  .players-info {
    flex-direction: column;
  }
  
  .player-info {
    width: 100%;
    margin-bottom: 10px;
  }
  
  .player-info:last-child {
    margin-bottom: 0;
  }
}
</style> 