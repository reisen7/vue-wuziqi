import { mqttService, topics } from './MQTTService';
import { gameService } from './GameService';
import { handleMatchRequest, handleCancelMatch } from './MatchingService';
import { userService } from './UserService';

// 初始化消息处理器
export function initMessageHandler() {
  console.log('初始化消息处理器...');
  
  // 监听MQTT消息
  mqttService.client.on('message', (topic, message) => {
    try {
      const messageStr = message.toString();
      console.log(`收到MQTT消息 [${topic}]: ${messageStr.substring(0, 200)}...`);
      
      const parsedMessage = JSON.parse(messageStr);
      
      // 处理匹配消息
      if (topic === topics.GAME_MATCHING) {
        console.log(`处理匹配消息: 类型=${parsedMessage.type}`);
        
        // 根据消息类型处理
        switch (parsedMessage.type) {
          case 'request_match':
            console.log('处理匹配请求');
            handleMatchRequest(parsedMessage);
            break;
            
          case 'cancel_match':
            console.log('处理取消匹配');
            handleCancelMatch(parsedMessage);
            break;
            
          case 'match_success':
            console.log('处理匹配成功');
            const myUserId = userService.userId.value;
            const players = parsedMessage.room.players;
            
            // 检查是否是我的匹配
            if (players.some(player => player.userId === myUserId)) {
              console.log('这是我的匹配，处理匹配成功');
              gameService.handleMatchSuccess(parsedMessage.room);
            } else {
              console.log('这不是我的匹配，忽略');
            }
            break;
            
          default:
            console.warn('未知的匹配消息类型:', parsedMessage.type);
        }
      }
      
      // 处理游戏消息
      if (topic === topics.GAME_PLAY || topic.startsWith(topics.GAME_ROOM)) {
        console.log(`处理游戏消息: 主题=${topic}, 类型=${parsedMessage.type || '未知'}`);
        gameService.handleMQTTMessage(topic, parsedMessage);
      }
      
    } catch (error) {
      console.error('处理消息时出错:', error);
    }
  });
  
  console.log('消息处理器初始化完成');
}