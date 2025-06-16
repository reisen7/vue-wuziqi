import SnowflakeId from 'snowflake-id';
import { ref } from 'vue';

// 配置雪花算法ID生成器
const snowflake = new SnowflakeId({
  mid: Math.floor(Math.random() * 1023), // 机器ID，随机生成
  offset: (2023 - 1970) * 365 * 24 * 60 * 60 * 1000 // 起始时间偏移量，从2023年开始
});

class UserService {
  constructor() {
    // 从本地存储加载用户ID，如果没有则生成新的
    const savedUserId = localStorage.getItem('wuziqi_user_id');
    this.userId = ref(savedUserId || this.generateUserId());
    
    if (!savedUserId) {
      localStorage.setItem('wuziqi_user_id', this.userId.value);
    }
    
    this.username = ref(localStorage.getItem('wuziqi_username') || `玩家${this.userId.value.substring(0, 6)}`);
  }
  
  // 生成新的用户ID
  generateUserId() {
    return snowflake.generate().toString();
  }
  
  // 设置用户名
  setUsername(name) {
    this.username.value = name;
    localStorage.setItem('wuziqi_username', name);
  }
  
  // 获取用户信息
  getUserInfo() {
    return {
      userId: this.userId.value,
      username: this.username.value
    };
  }
  
  // 重置用户ID（用于测试）
  resetUserId() {
    const newId = this.generateUserId();
    this.userId.value = newId;
    localStorage.setItem('wuziqi_user_id', newId);
    return newId;
  }
}

// 导出单例
export const userService = new UserService(); 