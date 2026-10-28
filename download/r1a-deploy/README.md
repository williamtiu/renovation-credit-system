# R1-7A 機械臂控制平台

基於 **ROS2 架構概念** 嘅 Unitree R1 7-DOF 機械臂底層控制平台，運行於 Linux，
提供 Web 介面 + REST API + WebSocket 即時遙測。

> 對應 SDK：[unitreerobotics/r1-7a_sdk](https://github.com/unitreerobotics/r1-7a_sdk)
> （IM6014 串列匯流排，`/dev/ttyUSB0` @ 6,000,000 baud，7 自由度，URDF frame）

## 功能

| 層 | 功能 |
|----|------|
| **Dashboard** | 7 關節即時遙測（q/dq/tau/溫度）@10Hz、趨勢圖、事件流、架構狀態 |
| **Control** | 關節滑條控制、Goto（cosine 軌跡）、FOC/Home/Stop/零力矩/Clear/Reset |
| **Poses** | 姿勢庫（一鍵執行、擷取當前姿勢、自訂管理） |
| **Logs** | 完整指令審計日誌（來源/參數/狀態/延遲） |
| **API 文檔** | REST + WebSocket 完整文檔（cURL / Python / Node.js 示例） |
| **Settings** | 驅動模式切換（模擬 / 串口 / C++ Bridge）+ 串口配置 |

## 安全設計

- E-STOP 緊急停止（UI 按鈕 / `Shift+Esc` / API），觸發後鎖定所有指令
- 關節位置限制驗證（URDF frame，逐關節 min/max）
- Goto duration 夾限 [0.5, 30] s、指令去抖 30ms
- 溫度監控（>55°C 警告、>70°C 危險標紅）
- 全指令審計日誌

## 目錄結構

```
r1a-deploy/
├── hardware-bridge/       # C++ Bridge（包裝 r1-7a_sdk → UDP JSON-RPC :15000）
│   ├── src/main.cpp       # 協議層完整，SDK 調用點以 TODO(r1a_sdk) 標註
│   ├── CMakeLists.txt
│   └── README.md
└── deploy/
    ├── DEPLOY.md          # 完整 Linux 部署指南（Ubuntu 20.04+）
    ├── systemd/           # 4 個 systemd 服務（開機自啟 + 自動重啟）
    └── udev/              # USB 串口固定裝置名 + 權限規則
```

## 快速開始（模擬模式，無需真機）

Web 平台預設以模擬模式啟動（內置 200Hz 物理引擎），可以直接體驗所有功能。

## 真機部署

見 `deploy/DEPLOY.md`。核心三步：

1. 編譯 `hardware-bridge`（對接 r1-7a_sdk）
2. 安裝 udev 規則 + systemd 服務
3. Web UI → Settings → C++ Bridge → 套用

## 技術棧

Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui + Prisma (SQLite) +
socket.io + Bun runtime。後端控制服務獨立埠運行（:3002/:3003），
配 C++ Bridge（r1-7a_sdk, IM6014）連接 `/dev/ttyUSB0`。
