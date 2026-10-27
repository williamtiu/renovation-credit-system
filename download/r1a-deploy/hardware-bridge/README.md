# R1-7A Hardware Bridge（C++）

包裝 `unitreerobotics/r1-7a_sdk`（IM6014 串列匯流排）為 UDP JSON-RPC 服務，作為 Node.js Robot Control Service 嘅硬件橋接層。

## 架構位置

```
Node.js Control Service (:3002, BridgeDriver)
        │  UDP JSON-RPC :15000
        ▼
  r1a_bridge（本程序）
        │  r1-7a_sdk / ArmMotorBus
        ▼
  /dev/ttyUSB0 @ 6000000 baud ──▶ R1-7A 機械臂 (7-DOF)
```

## 對接 r1-7a_sdk

`src/main.cpp` 內所有 `TODO(r1a_sdk)` 標註嘅位置係 SDK 調用點。
協議層（UDP / JSON / 100Hz 遙測推送 / RPC 分發）已完整實現。

按 SDK 實際標頭檔調整：

1. Clone SDK：
   ```bash
   git clone https://github.com/unitreerobotics/r1-7a_sdk.git
   ```
2. 修改 `CMakeLists.txt` 取消 `R1A_SDK_DIR` 相關註釋。
3. 喺 `ArmBridge` 類填入實際 API：
   - `connect()` — `ArmMotorBus` 初始化（串口 + 波特率）
   - `readTelemetry()` — 讀取 q / dq / tau / temp（URDF frame）
   - `command()` — FOC / Home / Goto / Stop / ZeroTorque / Clear / Reset

SDK 要點（來自官方 repo）：
- 關節值統一 URDF frame：`urdf = dir * scale * motor + offset`
- 校準數據：`config/joint_calib.txt`
- Goto 用 cosine 速度曲線（同 demo_arm_motion 一致）
- 需要 `dialout` 群組權限存取 `/dev/ttyUSB*`

## 編譯

```bash
sudo apt-get install -y cmake g++ build-essential
mkdir build && cd build
cmake .. && make -j$(nproc)
```

## 執行

```bash
# 參數: [串口] [波特率] [UDP 埠]
./r1a_bridge /dev/ttyUSB0 6000000 15000
```

## 驗證

```bash
# ping（同時註冊遙測推送）
echo '{"id":1,"method":"ping","params":{}}' | nc -u -w1 127.0.0.1 15000

# Home
echo '{"id":2,"method":"home","params":{}}' | nc -u -w1 127.0.0.1 15000

# Goto
echo '{"id":3,"method":"goto","params":{"joints":[0.5,0.35,0,1.2,0,0.2,0],"duration":2.0}}' \
  | nc -u -w1 127.0.0.1 15000
```

之後喺 Web UI → Settings → 揀「C++ Bridge（推薦真機）」→ 套用配置。
