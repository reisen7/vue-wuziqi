# 在线五子棋游戏

这是一个基于Vue.js和MQTT的在线五子棋游戏，支持实时对战。

## 功能特点

- 使用雪花算法生成用户ID
- MQTT实时通信
- 在线匹配对战
- 黑白棋随机分配
- 回合计时（30秒）
- 胜负判定
- 响应式设计

## 技术栈

- Vue.js 3
- MQTT.js
- Snowflake-ID
- UUID

## 安装与运行

1. 克隆仓库

```bash
git clone https://github.com/yourusername/vue-wuziqi.git
cd vue-wuziqi
```

2. 安装依赖

```bash
npm install
```

3. 运行开发服务器

```bash
npm run dev
```

4. 构建生产版本

```bash
npm run build
```

## 游戏规则

1. 打开游戏后，系统会自动为你分配一个唯一的用户ID
2. 点击"搜索对战"按钮开始匹配
3. 匹配成功后，系统会随机分配黑白棋
4. 黑棋先行，每人每回合有30秒的时间限制
5. 先将五颗棋子连成一线（横、竖、斜）的玩家获胜

## MQTT配置

游戏使用MQTT进行通信，连接地址为：

```
kf9d2a91.ala.cn-hangzhou.emqxsl.cn
```

MQTT主题：

- `wuziqi/matching`: 用于玩家匹配
- `wuziqi/play`: 用于游戏全局消息
- `wuziqi/room/{roomId}`: 用于特定房间的游戏消息

## 项目结构

```
src/
├── assets/            # 静态资源
├── components/        # 组件
│   ├── Chessboard.vue # 棋盘组件
│   └── GamePanel.vue  # 游戏控制面板组件
├── services/          # 服务
│   ├── GameService.js     # 游戏服务
│   ├── MatchingService.js # 匹配服务
│   ├── MessageHandler.js  # 消息处理器
│   ├── MQTTService.js     # MQTT服务
│   └── UserService.js     # 用户服务
├── App.vue            # 主应用组件
└── main.js            # 入口文件
```

## 多玩家匹配机制

游戏使用锁机制确保多玩家匹配时的线程安全：

1. 当玩家请求匹配时，会被添加到匹配队列
2. 匹配算法使用锁确保同一时间只有一个匹配操作在执行
3. 匹配成功后，玩家会被从队列中移除，并创建游戏房间

## 贡献

欢迎提交Issue和Pull Request！

## 许可证

MIT
