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

---
Task ID: 2
Agent: Main Agent (Z.ai)
Task: 會話恢復後嘅端到端驗證 — 確認三服務運作 + 安全層 + WS 串流 + 審計日誌

Work Log:
- 檢查服務狀態：:3000 Next.js / :3002 Control / :3003 WS Gateway 全部運行中
- 冒煙測試 goto（7 元素陣列 [0.5,0.1,-0.8,0.55,0,0,0.3]）→ 1.2s 後精確到位（誤差 0）
- 安全層測試：超出限位（J1 9.9 rad）正確拒絕、E-stop 觸發後 goto 被聯鎖阻擋、clear 後恢復
- 審計日誌：estop/clear/goto/home 全部記錄（Next.js API → Prisma SQLite）
- WS Gateway 正確協議驗證：subscribe {topics:[...]} → topic:/joint_states 串流 ≈9.6Hz、topic:/robot_state、command ack 轉發全部正常
- Web 頁面載入 HTTP 200（R1-7A 機械臂控制平台）

Stage Summary:
- 平台完整運作：三服務架構、底層控制指令鏈、ROS2 式 topic/service 模型、安全聯鎖、審計追蹤
- 交付就緒：預覽面板可即時體驗；download/r1a-deploy/ 提供真機部署路徑

---
Task ID: 3
Agent: Main Agent (Z.ai)
Task: 三大擴充功能 — 3D 可視化（Three.js）+ API Key 認證管理 + 軌跡錄製回放

Work Log:
- Prisma：新增 Trajectory model（points JSON 路徑點 + duration + pointCount）；修復 db push 相對路徑問題（正確 DATABASE_URL 絕對路徑）
- API Key 認證：src/lib/api-auth.ts（generateApiKey r1a_sk_ 前綴、掩碼、X-API-Key header + body.apiKey 兼容、角色 rank 檢查）
- Keys API：/api/keys（GET 掩碼列表/POST 建立一次性回傳完整 key）、[id] PATCH（角色/啟用）、DELETE、[id]/regenerate
- 認證接入：command/estop/poses execute 強制角色檢查（viewer 唯讀、operator 控制、admin 含 zero_torque/reset 危險指令）；E-stop 任何角色可用（安全優先）；全部審計入庫（含 apiUserId 關聯）
- 軌跡 API：/api/trajectories CRUD + [id]/execute 回放引擎（src/lib/playback-engine.ts：module 單例、逐點 goto、E-stop 每步檢查自動中止、cancel 即時 stop、完成/中止審計）+ playback 進度輪詢 + playback/cancel
- 3D 可視化（arm-3d.tsx，three@0.171 動態 import）：7-DOF URDF 運動鏈（pitch→X/roll→Z/yaw→Y nested pivots）、軀幹+底座+網格場景、OrbitControls、末端軌跡追踪（20Hz 採樣綠線）、E-stop 關節球轉紅、視角預設（前/側/俯/45°）、線框模式切換、ResizeObserver
- UI 新增 3 個 tab（總共 9 個）：3D 視圖、軌跡錄製回放（錄製計時/點數、保存對話框、速度選擇 0.5x/1x/2x、回放進度條、取消）、API Keys（建立/角色切換/啟用開關/重新生成/刪除、一次性 key 顯示+複製）
- API 文檔更新：X-API-Key 章節、trajectories/keys 全部新端點示例

驗證（API + agent-browser E2E + VLM 截圖分析）：
- Key 認證：viewer 拒控制（403）、operator goto 成功、operator 拒 zero_torque（admin only）、無效 key 401、停用 key 403、lastUsedAt 更新、掩碼顯示
- 軌跡：保存 3 點→2x 回放精確到位、並發回放 409、E-stop 中途自動中止（aborted）、cancel 即時停臂（max|dq|=0）、審計「開始/完成/中止」記錄
- 3D：WebGL canvas 914x560 渲染（VLM 確認連桿/關節球/夾爪/軌跡線/控制面板）、home 指令後 VLM 讀數 [0,0.1,0,0.55,0,0,0] 與 ARM_HOME 完全一致
- UI 流程：錄製按鈕→機械臂移動→停止→命名保存（38 點/18s toast）→UI 回放進度實時（4/38→23/38）→取消（aborted）
- lint 0 errors 0 warnings；E2E 全程 0 console errors

Stage Summary:
- 平台升級至 9 tab 完整功能：底層控制 + 3D 即時可視化 + 軌跡錄製回放 + API Key 認證管理
- 回放引擎為 module 單例（單進程單回放），E-stop 聯鎖每步檢查
- Key 認證模型：無 key（Web UI 本地）全權限；有 key 強制角色；E-stop 永遠允許
