# Dst-Admin-Web

饥荒联机版（Don't Starve Together）专用服务器管理面板——前端（React + Ant Design + Vite）。

## 功能

- 面板总览：系统监控（CPU/内存/磁盘/显存）、世界列表、玩家列表、游戏日志
- 世界管理：启动/停止（进度实时显示）、地图预览、备份/回档
- 模组管理：浏览/配置/校验/更新
- 房间设置、玩家日志、系统设置、多存档切换

## 开发

```bash
npm install
npm run dev      # 开发服务器（HMR，默认 5173/5174，API 代理到 8082）
npm run build    # 构建产物输出到 ../dst-admin-go/dist（由后端托管）
```

## License

MIT
