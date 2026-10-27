# Worklog

---
Task ID: 1
Agent: Main Agent (Z.ai)
Task: R1-7A 機械臂控制平台 — 基於 ROS2 架構嘅 Unitree R1 7-DOF 機械臂底層控制系統（Linux + Web UI + API）

Work Log:
- 研究 r1-7a_sdk（GitHub）：7-DOF R1 手臂、IM6014 串列匯流排、/dev/ttyUSB0 @ 6000000 baud、指令集 foc/home/goto/stop/zero_torque/clear/reset、URDF frame 轉換（urdf = dir*scale*motor + offset）
- 設計 ROS2 風格分層架構：Presentation(Web UI) → API Gateway(REST+WS) → Control Service(Lifecycle Node+Safety) → HAL(simulation/serial/bridge 三驅動) → Hardware Bridge(C++/SDK)
- Prisma schema：CommandLog（審計）、PosePreset（姿勢庫）、ApiUser（API key）、SystemParam
- Robot Control Service（:3002）：robot-model.ts（7 關節定義+限制）、simulation-driver.ts（200Hz 物理引擎+cosine 軌跡）、serial-driver.ts（IM6014 串口骨架+重連）、bridge-driver.ts（UDP JSON-RPC）、controller.ts（Lifecycle+安全層+去抖+E-stop）、index.ts（HTTP+SSE 串流）
- WS Gateway（:3003）：SSE 訂閱 → socket.io rooms 廣播（topic:/joint_states @10Hz、/robot_state、/events）、指令轉發帶 ack
- Next.js REST API：/api/robot/{state,command,joints,estop,logs,events}、/api/poses(+/[id]/execute)、/api/system/{info,configure}；全部接入 DB 審計
- Web UI（6 個 tab）：Dashboard（架構狀態+7 關節卡+recharts 趨勢圖+事件流）、Control（滑條+指令按鈕+dirty 偵測）、Poses（CRUD+擷取當前+執行）、Logs（審計表）、API 文檔（cURL/Python/Node/WS 示例）、Settings（三模式切換+串口配置+部署拓撲圖）
- 修復 bug #1：simulation-driver startTraj 冇同步 j.target → 軌跡完成後 FOC 拉返舊目標（獨立單元測試驗證修正）
- 修復 bug #2：ws-gateway subscribe 檢查 'topic:/' 前綴但客戶端發 '/joint_states' → 永遠入唔到 room，UI 只有初始快照（標準化 room 名修正）
- Agent Browser E2E 驗證：Dashboard 即時遙測（goto 後 0.272→0.719→0.800 實時跟隨）、Control 滑條→goto→機械臂精確到位（-2.87 極限測試）、E-STOP 觸發+聯鎖+清除恢復、Poses 執行、Logs 記錄、Settings 模式切換（bridge 失敗優雅處理+simulation 恢復）、toast 通知、0 console errors、手機 viewport 截圖
- 部署包（download/r1a-deploy/）：C++ Hardware Bridge（完整 UDP JSON-RPC 協議層+SDK 對接點標註）、systemd×4（bridge 即時調度優先級）、udev 規則（固定裝置名）、DEPLOY.md（Ubuntu 完整部署+安全規範+故障排查）
- lint 通過（0 errors）；修復 5 個 react-hooks/set-state-in-effect 錯誤（override/draft 衍生狀態模式、setTimeout 異步調度）

Stage Summary:
- 交付物：運行中嘅 Web 控制平台（Next.js :3000）+ Robot Control Service（:3002）+ WS Gateway（:3003）+ 真機部署包（download/r1a-deploy/）
- 關鍵決策：(1) 三驅動 HAL 統一接口，沙盒用 simulation、真機推薦 bridge（C++ 包裝 SDK 避免 Node 重寫 IM6014 協議）；(2) ROS2 概念完整映射（topic=WS rooms、service=REST、lifecycle=configure/activate、parameter=Settings）；(3) 安全層全部指令必經（限制驗證+去抖+E-stop 聯鎖）
- 兩個深度 bug 已修復並驗證：FOC 保持目標同步、WS topic 訂閱前綴
- 後續真機部署：clone r1-7a_sdk → 按 TODO(r1a_sdk) 標註對接 ArmMotorBus API → 編譯 bridge → systemd + udev → Web Settings 切換 bridge 模式
