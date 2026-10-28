# R1-7A 機械臂控制平台 — Linux 部署指南

基於 ROS2 架構概念嘅 Unitree R1 7-DOF 機械臂底層控制平台。
本文檔講解由零開始喺 Ubuntu Linux 部署成套系統連接真機。

## 系統需求

| 項目 | 要求 |
|------|------|
| OS | Ubuntu 20.04 LTS 或更新（aarch64 / x86_64） |
| 硬體 | Unitree R1 機械臂（USB 調試器接 `/dev/ttyUSB0`） |
| SDK | [unitreerobotics/r1-7a_sdk](https://github.com/unitreerobotics/r1-7a_sdk)（C++, gcc 9.4+） |
| Node | Bun 運行時（`curl -fsSL https://bun.sh/install | bash`） |
| 硬碟 | ~500 MB |

## 架構總覽

```
┌────────────────────────── Ubuntu Linux ───────────────────────────┐
│                                                                    │
│  瀏覽器 ──HTTP/WS──▶ Web 平台 (:3000)  [Next.js]                   │
│                          │ REST API          ▲ WebSocket           │
│                          ▼                   │ (:3003)             │
│                    Robot Control Service (:3002) ◄── WS Gateway    │
│                          │                                         │
│                          │ UDP JSON-RPC (:15000)                   │
│                          ▼                                         │
│                  r1a_bridge (C++ / r1-7a_sdk)                      │
│                          │ IM6014 serial bus                       │
│                          ▼                                         │
│                /dev/ttyUSB0 @ 6,000,000 baud                       │
│                          ▼                                         │
│                   R1-7A 機械臂 (7-DOF)                             │
└────────────────────────────────────────────────────────────────────┘
```

**ROS2 概念映射**：Topic (`/joint_states`) = WebSocket rooms；Service (`/arm/goto`) = REST endpoint；Parameter Server = Settings；Lifecycle Node = configure/activate 流程；rosbridge = WS Gateway。

## 部署步驟

### 1. 系統準備

```bash
# 編譯工具 + dialout 權限（重新登入生效）
sudo apt-get update
sudo apt-get install -y cmake g++ build-essential
sudo usermod -aG dialout $USER

# Bun 運行時
curl -fsSL https://bun.sh/install | bash
```

### 2. 建立 R1-7A SDK Bridge

```bash
sudo mkdir -p /opt/r1a
cd /opt/r1a

# Clone SDK 同部署包
git clone https://github.com/unitreerobotics/r1-7a_sdk.git
# （將本部署包嘅 hardware-bridge/ 複製到 /opt/r1a/hardware-bridge）

# 編譯 Bridge（按 hardware-bridge/README.md 對接 SDK API）
cd hardware-bridge
mkdir build && cd build && cmake .. && make -j$(nproc)
```

### 3. 部署 Web 平台

```bash
# 將項目（web 平台原始碼）複製到 /opt/r1a/web
cd /opt/r1a/web
bun install
bun run db:push          # 初始化數據庫
bun run build            # 生產構建

# 啟動兩個 mini-service（systemd 會託管，呢度係手動測試用）
cd mini-services/robot-control && bun install && cd ../..
cd mini-services/ws-gateway && bun install && cd ../..
```

### 4. Udev 規則（固定裝置名 + 自動啟動服務）

```bash
sudo cp deploy/udev/99-r1a-arm.rules /etc/udev/rules.d/
sudo udevadm control --reload && sudo udevadm trigger
```

### 5. Systemd 服務（開機自啟 + 崩潰自動重啟）

```bash
sudo cp deploy/systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now r1a-bridge r1a-control r1a-gateway r1a-web
sudo systemctl status r1a-bridge r1a-control r1a-gateway r1a-web
```

### 6. 驗證

```bash
# Bridge 遙測（ping 註冊後會連續推送）
echo '{"id":1,"method":"ping","params":{}}' | nc -u -w1 127.0.0.1 15000

# Control Service 狀態
curl http://localhost:3002/state | head -c 200

# Web 平台
curl http://localhost:3000/api/system/info | head -c 200
```

瀏覽器打開 `http://<部署機IP>:3000` → Settings → 揀「C++ Bridge（推薦真機）」→ 套用配置並激活。

## 安全操作規範

1. **E-STOP**：Web 介面紅色按鈕或 `Shift+Esc`；API `POST /api/robot/estop`
2. **首次通電**：先 `home` 歸零，確認關節範圍內冇障礙物
3. **零力矩**：手臂會因重力下墜，只喺安全姿態使用
4. **關節限制**：所有 goto 指令經安全層驗證（URDF frame 限制喺 `robot-model.ts` 配置）
5. **指令審計**：所有指令記錄喺 Logs 頁（Prisma SQLite）

## 常見問題

| 症狀 | 原因 / 解法 |
|------|-------------|
| `無法打開 /dev/ttyUSB0` | 未加 dialout 群組：`sudo usermod -aG dialout $USER` 後重新登入 |
| Bridge 連唔上 (code 30) | `r1a-bridge` 服務未啟動：`sudo systemctl status r1a-bridge` |
| 遙測超時 (code 32) | IM6014 串口被佔用；重啟 `r1a-bridge`；確認波特率 6000000 |
| ttyUSB 編號改變 | udev 規則 `/dev/r1a_arm` symlink 固定裝置名 |
| Web 顯示 REST 輪詢 | WS Gateway 未啟動：`sudo systemctl status r1a-gateway` |

## API 快速參考

```bash
# 狀態
curl http://<host>:3000/api/robot/state

# Goto（7 關節, rad, URDF frame）
curl -X POST http://<host>:3000/api/robot/command \
  -H "Content-Type: application/json" \
  -d '{"type":"goto","joints":[0.5,0.35,0,1.2,0,0.2,0],"duration":2.5}'

# 緊急停止
curl -X POST http://<host>:3000/api/robot/estop
```

完整文檔喺 Web UI → API 文檔 頁（含 cURL / Python / Node.js / WebSocket 示例）。
