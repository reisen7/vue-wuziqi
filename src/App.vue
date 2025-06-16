<script setup>
import { onMounted, onBeforeUnmount, ref, computed } from 'vue';
import Chessboard from './components/Chessboard.vue';
import GamePanel from './components/GamePanel.vue';
import { gameService } from './services/GameService';
import { mqttService } from './services/MQTTService';
import { userService } from './services/UserService';
import { initMessageHandler } from './services/MessageHandler';

// 连接状态
const mqttConnected = computed(() => mqttService.connected.value);
const connectionStatus = computed(() => mqttConnected.value ? '已连接' : '连接中...');

// 在组件挂载时初始化游戏服务和MQTT连接
onMounted(() => {
  console.log('App组件已挂载，初始化服务...');
  
  // 首先初始化MQTT连接
  mqttService.connect();
  
  // 等待连接建立后初始化游戏服务
  setTimeout(() => {
    // 初始化游戏服务
    gameService.init();
    
    // 初始化消息处理器
    initMessageHandler();
    
    console.log('所有服务初始化完成');
  }, 1000);
});

// 在组件卸载前断开MQTT连接
onBeforeUnmount(() => {
  console.log('组件卸载，清理资源...');
  
  // 如果在游戏中，先离开游戏
  if (gameService.status.value === 'playing') {
    console.log('正在游戏中，执行离开游戏操作');
    gameService.leaveGame();
  }
  
  // 停止所有计时器
  gameService.stopTurnTimer();
  
  // 重置游戏状态
  gameService.startNewGame();
  
  // 断开MQTT连接
  mqttService.disconnect();
  
  console.log('资源清理完成');
});

// 修改用户名
const newUsername = ref('');
const showUsernameModal = ref(false);

const openUsernameModal = () => {
  newUsername.value = userService.username.value;
  showUsernameModal.value = true;
};

const saveUsername = () => {
  if (newUsername.value.trim()) {
    userService.setUsername(newUsername.value.trim());
  }
  showUsernameModal.value = false;
};
</script>

<template>
  <div class="app-container">
    <header>
      <h1>在线五子棋</h1>
      <div class="connection-status" :class="{ 'connected': mqttConnected }">
        服务器状态: {{ connectionStatus }}
      </div>
    </header>
    
    <div class="user-profile-bar">
      <div class="user-avatar" :style="{ backgroundColor: getUserColor(userService.userId.value) }">
        {{ userService.username.value.substring(0, 1) }}
      </div>
      <div class="user-info">
        <div class="username">{{ userService.username.value }} <span class="edit-icon" @click="openUsernameModal">✏️</span></div>
        <div class="user-id">用户ID: {{ userService.userId.value }}</div>
      </div>
      <div class="game-stats">
        <div class="stat-item">
          <div class="stat-label">状态</div>
          <div class="stat-value" :class="getStatusClass(gameService.status.value)">{{ getStatusText(gameService.status.value) }}</div>
        </div>
      </div>
    </div>
    
    <main>
      <div class="game-container">
        <div class="game-board">
          <Chessboard />
        </div>
        <div class="game-sidebar">
          <GamePanel />
        </div>
      </div>
    </main>
    
    <footer>
      <p>© {{ new Date().getFullYear() }} 在线五子棋 - MQTT实时对战</p>
      <p class="server-info">MQTT服务器: kf9d2a91.ala.cn-hangzhou.emqxsl.cn</p>
    </footer>
    
    <!-- 修改用户名弹窗 -->
    <div class="modal-overlay" v-if="showUsernameModal" @click="showUsernameModal = false">
      <div class="modal-content" @click.stop>
        <h3>修改用户名</h3>
        <input type="text" v-model="newUsername" placeholder="请输入新用户名" @keyup.enter="saveUsername">
        <div class="modal-buttons">
          <button @click="showUsernameModal = false">取消</button>
          <button class="primary-button" @click="saveUsername">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// 根据用户ID生成颜色
function getUserColor(userId) {
  // 简单的哈希算法生成颜色
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 60%)`;
}

// 获取状态文本
function getStatusText(status) {
  switch (status) {
    case 'idle': return '空闲';
    case 'matching': return '匹配中';
    case 'playing': return '游戏中';
    case 'game_over': return '游戏结束';
    default: return '未知状态';
  }
}

// 获取状态样式类
function getStatusClass(status) {
  switch (status) {
    case 'idle': return 'status-idle';
    case 'matching': return 'status-matching';
    case 'playing': return 'status-playing';
    case 'game_over': return 'status-game-over';
    default: return '';
  }
}
</script>

<style>
/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Microsoft YaHei', Arial, sans-serif;
  background-color: #f0f2f5;
  color: #333;
  line-height: 1.6;
}

/* 应用容器 */
.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* 头部样式 */
header {
  text-align: center;
  margin-bottom: 20px;
  position: relative;
}

header h1 {
  font-size: 32px;
  color: #2c3e50;
  margin-bottom: 5px;
}

.connection-status {
  font-size: 14px;
  color: #e74c3c;
  transition: color 0.3s;
}

.connection-status.connected {
  color: #2ecc71;
}

/* 用户资料栏 */
.user-profile-bar {
  display: flex;
  align-items: center;
  background-color: #fff;
  padding: 15px 20px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.user-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 24px;
  color: white;
  font-weight: bold;
  margin-right: 15px;
}

.user-info {
  flex: 1;
}

.username {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
}

.edit-icon {
  font-size: 16px;
  margin-left: 8px;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.3s;
}

.edit-icon:hover {
  opacity: 1;
}

.user-id {
  font-size: 14px;
  color: #666;
  word-break: break-all;
}

.game-stats {
  display: flex;
  margin-left: 20px;
}

.stat-item {
  text-align: center;
  margin-left: 20px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.stat-value {
  font-size: 16px;
  font-weight: bold;
}

.status-idle { color: #666; }
.status-matching { color: #f39c12; }
.status-playing { color: #2ecc71; }
.status-game-over { color: #e74c3c; }

/* 主内容区域 */
main {
  margin-bottom: 40px;
}

/* 游戏容器 */
.game-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: center;
}

/* 游戏棋盘 */
.game-board {
  flex: 1;
  min-width: 300px;
  display: flex;
  justify-content: center;
}

/* 游戏侧边栏 */
.game-sidebar {
  width: 100%;
  max-width: 400px;
}

/* 页脚样式 */
footer {
  text-align: center;
  padding: 20px 0;
  color: #666;
  font-size: 14px;
  border-top: 1px solid #eee;
}

.server-info {
  font-size: 12px;
  margin-top: 5px;
  color: #999;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: #fff;
  padding: 20px;
  border-radius: 10px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.modal-content h3 {
  margin-bottom: 15px;
  text-align: center;
}

.modal-content input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  margin-bottom: 15px;
  font-size: 16px;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
}

.modal-buttons button {
  padding: 8px 15px;
  border: none;
  border-radius: 5px;
  margin-left: 10px;
  cursor: pointer;
  font-size: 14px;
  background-color: #e0e0e0;
}

.modal-buttons .primary-button {
  background-color: #3498db;
  color: white;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .game-container {
    flex-direction: column;
  }
  
  .game-sidebar {
    width: 100%;
    max-width: none;
  }
  
  .user-profile-bar {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .user-avatar {
    margin-right: 0;
    margin-bottom: 10px;
  }
  
  .game-stats {
    margin-left: 0;
    margin-top: 10px;
  }
}
</style>
