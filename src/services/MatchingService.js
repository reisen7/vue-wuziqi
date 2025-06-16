import { mqttService, topics } from './MQTTService';
import { v4 as uuidv4 } from 'uuid';
import { userService } from './UserService';

// 匹配状态
const MATCHING_STATUS = {
  NOT_MATCHING: 'not_matching',
  MATCHING: 'matching'
};

// 游戏状态常量
const GAME_STATUS = {
  MATCHING: 'matching'
};

// 游戏服务引用
let gameServiceRef = null;

// 当前匹配状态
let currentMatchingStatus = MATCHING_STATUS.NOT_MATCHING;

// 设置游戏服务引用
export function setGameServiceRef(ref) {
  gameServiceRef = ref;
  console.log('已设置游戏服务引用');
}

// 设置匹配状态
export function setMatchingStatus(isMatching) {
  currentMatchingStatus = isMatching ? MATCHING_STATUS.MATCHING : MATCHING_STATUS.NOT_MATCHING;
  console.log(`设置匹配状态: ${currentMatchingStatus}`);
}

// 处理匹配请求
export function handleMatchRequest(message) {
  const { userId, username } = message;
  const myUserId = userService.userId.value;
  
  console.log(`收到匹配请求: 用户 ${username} (${userId}), 我的ID: ${myUserId}, 我的状态: ${currentMatchingStatus}`);
  
  // 不处理自己发出的请求
  if (userId === myUserId) {
    console.log('忽略自己发出的匹配请求');
    return;
  }
  
  // 如果我们正在匹配中，则创建匹配
  if (currentMatchingStatus === MATCHING_STATUS.MATCHING) {
    console.log(`我正在寻找对手，匹配用户 ${username}`);
    
    // 创建房间数据
    const roomId = uuidv4();
    const currentTime = new Date().getTime();
    const isFirstPlayerBlack = Math.random() >= 0.5;
    
    const roomData = {
      roomId,
      players: [
        {
          userId: myUserId,
          username: userService.username.value,
          pieceType: isFirstPlayerBlack ? 1 : 2  // 1=黑棋, 2=白棋
        },
        {
          userId: userId,
          username: username,
          pieceType: isFirstPlayerBlack ? 2 : 1
        }
      ],
      currentTurn: isFirstPlayerBlack ? myUserId : userId,  // 黑棋先行
      startTime: currentTime,
      lastMoveTime: currentTime
    };
    
    console.log('创建房间数据:', roomData);
    
    // 发送匹配成功消息
    mqttService.publish(topics.GAME_MATCHING, {
      type: 'match_success',
      room: roomData,
      timestamp: currentTime
    });
    
    console.log(`已发送匹配成功消息, 匹配对手: ${username}`);
    
    // 更新匹配状态
    setMatchingStatus(false);
  } else {
    console.log('我当前不在匹配状态，忽略匹配请求');
  }
}

// 处理取消匹配请求
export function handleCancelMatch(message) {
  // 简化的取消匹配逻辑
  console.log('收到取消匹配请求:', message);
} 