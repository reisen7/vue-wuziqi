<template>
  <div class="chessboard-container">
    <div class="chessboard" :style="{ width: `${boardSize * gridSize}px`, height: `${boardSize * gridSize}px` }">
      <!-- 棋盘背景 -->
      <div class="board-background"></div>
      
      <!-- 棋盘格线 -->
      <div class="grid-lines">
        <div v-for="i in boardSize" :key="`h-${i}`" class="horizontal-line" 
             :style="{ top: `${(i - 1) * gridSize}px`, width: `${boardSize * gridSize - 1}px` }"></div>
        <div v-for="i in boardSize" :key="`v-${i}`" class="vertical-line" 
             :style="{ left: `${(i - 1) * gridSize}px`, height: `${boardSize * gridSize - 1}px` }"></div>
      </div>
      
      <!-- 棋盘标记点 -->
      <div class="mark-points">
        <div v-for="point in markPoints" :key="`mark-${point.x}-${point.y}`" class="mark-point"
             :style="{ left: `${point.x * gridSize - 3}px`, top: `${point.y * gridSize - 3}px` }"></div>
      </div>
      
      <!-- 棋子 -->
      <div class="pieces">
        <div v-for="(row, rowIndex) in board" :key="`row-${rowIndex}`" class="board-row">
          <div v-for="(cell, colIndex) in row" :key="`cell-${rowIndex}-${colIndex}`" 
               class="board-cell"
               :class="{ 'can-place': isMyTurn && cell === 0 }"
               :style="{ width: `${gridSize}px`, height: `${gridSize}px`, 
                         left: `${colIndex * gridSize - gridSize / 2}px`, 
                         top: `${rowIndex * gridSize - gridSize / 2}px` }"
               @click="handleCellClick(rowIndex, colIndex)">
            <div v-if="cell === 1" class="piece black-piece"></div>
            <div v-if="cell === 2" class="piece white-piece"></div>
          </div>
        </div>
      </div>
      
      <!-- 最后落子标记 -->
      <div v-if="lastMove" class="last-move-marker"
           :style="{ left: `${lastMove.col * gridSize - 4}px`, top: `${lastMove.row * gridSize - 4}px` }"></div>
           
      <!-- 坐标标签 -->
      <div class="coordinates">
        <div class="row-labels">
          <div v-for="i in boardSize" :key="`row-label-${i}`" class="row-label"
               :style="{ top: `${(i - 1) * gridSize - 10}px` }">
            {{ i }}
          </div>
        </div>
        <div class="col-labels">
          <div v-for="i in boardSize" :key="`col-label-${i}`" class="col-label"
               :style="{ left: `${(i - 1) * gridSize - 4}px` }">
            {{ String.fromCharCode(64 + i) }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- 游戏信息 -->
    <div class="game-info">
      <div class="turn-info">
        <div class="turn-label">当前回合:</div>
        <div class="turn-value" :class="{ 'my-turn': isMyTurn }">
          {{ isMyTurn ? '你的回合' : '对方回合' }}
        </div>
      </div>
      
      <div class="timer">
        <div class="timer-label">剩余时间:</div>
        <div class="timer-value" :class="{ 'time-warning': turnTimer <= 10 }">{{ turnTimer }}秒</div>
      </div>
    </div>
    
    <!-- 我的棋子类型 -->
    <div class="my-piece-type" v-if="gameService.status.value === 'playing'">
      <div class="piece-label">我的棋子:</div>
      <div class="piece-display">
        <div class="piece" :class="{ 
          'black-piece': gameService.myPieceType.value === 1, 
          'white-piece': gameService.myPieceType.value === 2 
        }"></div>
        <span>{{ gameService.myPieceType.value === 1 ? '黑棋' : '白棋' }}</span>
      </div>
    </div>
    
    <!-- 操作提示 -->
    <div class="operation-hint" v-if="gameService.status.value === 'playing' && isMyTurn">
      <div class="hint-icon">💡</div>
      <div class="hint-text">点击棋盘空位放置棋子</div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { gameService, PieceType } from '../services/GameService';
import { userService } from '../services/UserService';

export default {
  name: 'Chessboard',
  setup() {
    const boardSize = 15;
    const gridSize = 30; // 每个格子的大小（像素）
    
    // 标记点位置 (3x3, 中心点)
    const markPoints = [
      { x: 3, y: 3 },
      { x: 3, y: 7 },
      { x: 3, y: 11 },
      { x: 7, y: 3 },
      { x: 7, y: 7 },
      { x: 7, y: 11 },
      { x: 11, y: 3 },
      { x: 11, y: 7 },
      { x: 11, y: 11 },
    ];
    
    // 最后一步落子
    const lastMove = ref(null);
    
    // 从游戏服务获取棋盘状态
    const board = computed(() => gameService.board.value);
    
    // 从游戏服务获取回合计时器
    const turnTimer = computed(() => gameService.turnTimer.value);
    
    // 判断是否是自己的回合
    const isMyTurn = computed(() => {
      return gameService.room.currentTurn === userService.userId.value;
    });
    
    // 监听棋盘变化，更新最后落子位置
    watch(board, (newBoard, oldBoard) => {
      if (!oldBoard) return;
      
      // 查找新添加的棋子
      for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
          if (newBoard[row][col] !== PieceType.EMPTY && oldBoard[row][col] === PieceType.EMPTY) {
            lastMove.value = { row, col };
            return;
          }
        }
      }
    }, { deep: true });
    
    // 处理格子点击
    const handleCellClick = (row, col) => {
      // 如果不是自己的回合，或者位置已有棋子，则不处理
      if (!isMyTurn.value || board.value[row][col] !== PieceType.EMPTY) {
        return;
      }
      
      // 调用游戏服务的下棋方法
      gameService.placePiece(row, col);
    };
    
    return {
      boardSize,
      gridSize,
      markPoints,
      board,
      turnTimer,
      isMyTurn,
      lastMove,
      handleCellClick,
      gameService,
    };
  }
};
</script>

<style scoped>
.chessboard-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 20px auto;
}

.chessboard {
  position: relative;
  margin: 0 auto;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}

.board-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #e6bf83;
  background-image: linear-gradient(45deg, #e6bf83 0%, #d5b27c 100%);
  z-index: 1;
}

.grid-lines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
}

.horizontal-line, .vertical-line {
  position: absolute;
  background-color: #000;
}

.horizontal-line {
  height: 1px;
}

.vertical-line {
  width: 1px;
}

.mark-points {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 3;
}

.mark-point {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #000;
}

.pieces {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 4;
}

.board-cell {
  position: absolute;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.board-cell.can-place:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

.piece {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
  transition: transform 0.2s;
}

.black-piece {
  background-color: #000;
  background-image: radial-gradient(circle at 30% 30%, #444 0%, #000 70%);
}

.white-piece {
  background-color: #fff;
  background-image: radial-gradient(circle at 30% 30%, #fff 0%, #eee 70%);
  border: 1px solid #ddd;
}

.last-move-marker {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #ff0000;
  z-index: 5;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.5); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
}

.coordinates {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

.row-labels {
  position: absolute;
  left: -20px;
  top: 0;
  height: 100%;
}

.row-label {
  position: absolute;
  font-size: 12px;
  color: #555;
  left: 0;
  width: 15px;
  text-align: center;
}

.col-labels {
  position: absolute;
  top: -20px;
  left: 0;
  width: 100%;
}

.col-label {
  position: absolute;
  font-size: 12px;
  color: #555;
  top: 0;
  width: 15px;
  text-align: center;
}

.game-info {
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-top: 20px;
  padding: 12px 15px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.turn-info, .timer {
  display: flex;
  align-items: center;
}

.turn-label, .timer-label {
  margin-right: 10px;
  font-weight: bold;
  color: #555;
}

.my-turn {
  color: #2ecc71;
  font-weight: bold;
}

.time-warning {
  color: #ff0000;
  font-weight: bold;
  animation: blink 1s infinite;
}

@keyframes blink {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.my-piece-type {
  display: flex;
  align-items: center;
  margin-top: 15px;
  padding: 12px 15px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  width: 100%;
}

.piece-label {
  font-weight: bold;
  margin-right: 10px;
  color: #555;
}

.piece-display {
  display: flex;
  align-items: center;
}

.piece-display .piece {
  width: 20px;
  height: 20px;
  margin-right: 8px;
}

.operation-hint {
  display: flex;
  align-items: center;
  margin-top: 15px;
  padding: 10px 15px;
  background-color: rgba(46, 204, 113, 0.1);
  border-left: 3px solid #2ecc71;
  border-radius: 4px;
  width: 100%;
}

.hint-icon {
  margin-right: 10px;
  font-size: 16px;
}

.hint-text {
  font-size: 14px;
  color: #555;
}

@media (max-width: 480px) {
  .game-info {
    flex-direction: column;
  }
  
  .turn-info {
    margin-bottom: 10px;
  }
}
</style> 