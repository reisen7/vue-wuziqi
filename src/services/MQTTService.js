import mqtt from 'mqtt';
import { ref } from 'vue';

// MQTT连接配置
const mqttConfig = {
  host: 'kf9d2a91.ala.cn-hangzhou.emqxsl.cn',  // 使用公共测试服务器
  port: 8084, // WebSocket SSL端口
  protocol: 'wss',
  username: 'reisen7', // 如果需要认证，请修改为实际的用户名
  password: 'if5:a:R4sXXdE2A', // 如果需要认证，请修改为实际的密码
  clientId: 'vue_wuziqi_' + Math.random().toString(16).substring(2, 8),
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
};

// MQTT主题 - 使用固定主题以确保所有用户都在同一频道
const topics = {
  GAME_MATCHING: 'wuziqi/matching_channel',
  GAME_PLAY: 'wuziqi/play_channel',
  GAME_ROOM: 'wuziqi/room_channel/',
};

console.log('使用MQTT主题:', topics);

class MQTTService {
  constructor() {
    this.client = null;
    this.connected = ref(false);
    this.messages = ref([]);
    this.subscriptions = new Set();
  }

  // 连接到MQTT服务器
  connect() {
    const { host, port, protocol } = mqttConfig;
    const url = `${protocol}://${host}:${port}/mqtt`;
    
    console.log(`正在连接MQTT服务器: ${url}`);
    this.client = mqtt.connect(url, mqttConfig);

    this.client.on('connect', () => {
      console.log('已成功连接到MQTT服务器');
      this.connected.value = true;
      
      // 连接成功后，立即订阅所有主题
      this.subscribeToAllTopics();
    });

    this.client.on('error', (error) => {
      console.error('MQTT连接错误:', error);
      this.connected.value = false;
    });

    this.client.on('message', (topic, message) => {
      try {
        console.log(`收到原始消息 [${topic}]: ${message.toString()}`);
        const parsedMessage = JSON.parse(message.toString());
        this.messages.value.push({ topic, message: parsedMessage, timestamp: new Date() });
        console.log(`解析后的消息:`, parsedMessage);
      } catch (error) {
        console.error('解析消息失败:', error, message.toString());
      }
    });

    this.client.on('reconnect', () => {
      console.log('正在重新连接到MQTT服务器...');
    });

    this.client.on('disconnect', () => {
      console.log('已断开与MQTT服务器的连接');
      this.connected.value = false;
    });
  }
  
  // 订阅所有主题
  subscribeToAllTopics() {
    console.log('正在订阅所有主题...');
    // 订阅匹配主题
    this.subscribe(topics.GAME_MATCHING);
    // 订阅游戏主题
    this.subscribe(topics.GAME_PLAY);
    console.log('所有主题订阅请求已发送');
  }

  // 订阅主题
  subscribe(topic) {
    console.log(`正在订阅主题: ${topic}`);
    
    if (!this.client) {
      console.error('MQTT客户端未初始化，无法订阅主题');
      return;
    }
    
    this.client.subscribe(topic, { qos: 1 }, (error, granted) => {
      if (error) {
        console.error(`订阅主题 ${topic} 失败:`, error);
      } else {
        console.log(`已成功订阅主题: ${topic}`, granted);
        this.subscriptions.add(topic);
        
        // 测试发布一条消息到该主题
        if (topic === topics.GAME_MATCHING) {
          console.log(`发送测试消息到主题: ${topic}`);
          this.publish(topic, {
            type: 'test',
            message: '这是一条测试消息',
            timestamp: new Date().getTime()
          });
        }
      }
    });
  }

  // 取消订阅主题
  unsubscribe(topic) {
    if (this.client) {
      this.client.unsubscribe(topic, (error) => {
        if (error) {
          console.error(`取消订阅主题 ${topic} 失败:`, error);
        } else {
          console.log(`已取消订阅主题: ${topic}`);
          this.subscriptions.delete(topic);
        }
      });
    }
  }

  // 发布消息
  publish(topic, message) {
    console.log(`正在发布消息到主题: ${topic}`, message);
    
    if (!this.client) {
      console.error('MQTT客户端未初始化，无法发布消息');
      return;
    }
    
    const messageStr = JSON.stringify(message);
    this.client.publish(topic, messageStr, { qos: 1 }, (error) => {
      if (error) {
        console.error(`发布消息到主题 ${topic} 失败:`, error);
      } else {
        console.log(`已成功发布消息到主题: ${topic}`);
      }
    });
  }

  // 断开连接
  disconnect() {
    if (this.client) {
      this.client.end();
      this.connected.value = false;
      this.subscriptions.clear();
      console.log('已断开与MQTT服务器的连接');
    }
  }
}

// 导出单例
export const mqttService = new MQTTService();
export { topics }; 