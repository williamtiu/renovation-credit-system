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

---
Task ID: ppt-b
Agent: ppt-expert B

Work Log (slides[6:11] rendered, /home/z/my-project/download/slides/):
- slide_07.html — 3D 即時可視化：左 59% shot-3d.png hero 截圖（452px、object-position:center）+ VLM 驗證讀數 [0, 0.10, 0, 0.55, 0, 0, 0] 註解條，右 41% 四張功能卡（7-DOF 運動鏈／末端軌跡追蹤／E-stop 視覺聯動紅色 tile／視角控制）。
- slide_08.html — 軌跡錄製與回放：雙截圖（錄製中紅點＋已保存綠點標籤、各 308px）＋ ①錄製→②保存→③回放 三段流程卡（→ 字符銜接）＋ 底部紅色 shield 安全提示帶（max|dq| = 0、409 拒絕）。
- slide_09.html — 安全設計：左 55% 五條編號防護帶（01 限位驗證 9.9 rad 拒絕實測、02 去抖、03 E-stop 聯鎖、04 角色權限、05 審計追蹤），右 45% shot-logs.png 滿高截圖＋審計日誌留痕標籤。
- slide_10.html — API 生態：左 55% 兩塊語法高亮 code-block（curl REST 指令、socket.emit WS 訂閱 9.6 Hz，橙關鍵字／青字串）＋三條 chip-row，右 45% shot-keys.png＋API Keys 管理台標籤＋viewer/operator/admin 三行角色矩陣。
- slide_11.html — 章節頁二：與 slide_04 同款 — 巨型 02（Space Grotesk 700、210px、橙色描邊）＋ / 02、--fs-display 標題「驗證與落地」、副句、右下三 chip 預告、.grid-bg＋左側 4px 橙色豎線。
---

## Task ID: ppt-c — Agent: ppt-expert C

- slide_12.html（驗證結果）: 4 張橙色巨型數據卡（0 rad / 9.6 Hz / 0 / 100%）置頂，10 行 E2E 驗證矩陣拆成左右兩欄各 5 行（測項左、綠色 ✓ 結果右），全部內容在 720px 內無溢出。
- slide_13.html（真機部署）: 左 40% 生產線場景滿高 .shot 圖（object-fit:cover）+ 圖註，右 60% 為 r1a-deploy 部署包 4 行清單卡與 STEP 1/2/3 橫向步驟帶（大數字編號、→ 銜接）。
- slide_14.html（技術棧）: Frontend / Backend / Hardware / Quality 四等寬直卡（青色 icon 磚 + 橙色 ‣ 逐行技術項），底部 card-2 橫帶呈現「TypeScript → C++ 隔離」一句。
- slide_15.html（路線圖）: 三欄近→遠直卡（下一版橙框強調含 3 條圖文條目、中期、遠期各 3 項），頁首右側「近 ──→ 遠」指示，底部 IK 擴展註記。
- slide_16.html（結語）: 左側大標「從網頁滑條，到 6 Mbaud 串口」（6 Mbaud 橙色 mono）+ 01/02/03 編號 takeaway，右 36% 焊接火花滿高圖左緣漸變融入 #0B0E13，底部全寬 CTA 帶右端 Thank You（Space Grotesk 橙）。

---
Task ID: ppt-a
Agent: ppt-expert A

Work Log (slides[0:6] rendered, /home/z/my-project/download/slides/):
- slide_01.html — 封面：左 58% 文字（R1-7A Space Grotesk + 機械臂控制平台 Noto 900、控制平台橙色）+ 右 42% Unitree R1 滿高圖左緣漸變融入 #0B0E13、grid-bg、底部 7 / 200 Hz / 3 / 9 橙色 num 數據點與 micro 行。
- slide_02.html — 挑戰與目標：左 55% 四張紅 icon 痛點卡（cable / visibility_off / gpp_maybe / fact_check，IM6014、6,000,000 baud、urdf = dir × scale × motor + offset 以 mono 呈現），右 45% card-2「一個生產級 Web 控制平台」+ 三個綠 check_circle 目標 + chip-accent「模擬即真機」。
- slide_03.html — 平台總覽：2×2 bento（:3000 / :3002 橙框強調 / :3003 端口徽章、Hardware Bridge 實體 icon、9 個功能頁面 chips），底部 ROS 2 概念映射橫帶（topic → WS rooms（/joint_states · /robot_state · /events）等 4 組 mono 對照）。
- slide_04.html — 章節頁一：巨型 01（Space Grotesk 700、212px、橙色描邊）+ / 02 muted、「系統設計與實現」--fs-display、右下三 chip 預告、grid-bg + 左側 4px 橙色豎線，超大留白。
- slide_05.html — 系統架構：左 62% L1–L5 五層 card 帶（Presentation → Hardware 橙框強調，層間以 ▾ 字符銜接、零 SVG），右 38%「三個關鍵設計決策」卡片（tune / south / replay 橙 icon）。
- slide_06.html — 即時控制：左 52% shot-control.png（430px .shot 框、object-position:top）+ 7 個指令 chip（goto chip-accent 標記最常用），右 48% 關節規格 7 行 4 列表格（J1–J7 行程 rad / 峰值扭矩 mono）+ dirty 偵測、50Hz 遙測兩徽章。

Stage Summary:
- 六頁全部通過自動化檢查（1280×720 精確畫布、零溢出、卡片內部無剪裁、截圖/網圖載入成功、指令 chip 單行）與 VLM 視覺 QA（六頁全 PASS）；配色與字體嚴格按 design tokens，無頁首頁尾頁碼。

---

## Task ID: ppt-fix-a
**Agent:** ppt-expert fix A

- slide_01.html — 封面右側機器人圖左緣改用 45% 寬三段漸層（#0B0E13 → 85% → 透明）消除硬切邊，副標題升至 18px / font-weight 500（驗證單行不換行）。
- slide_02.html — 痛點卡 01 拆成雙層：散文一行 + `urdf = dir × scale × motor + offset` 獨立 mono 橙字藥丸（surface-2 底 / line 邊框），`/dev/ttyUSB0 · 6,000,000 baud` 統一 mono 高亮；右側目標卡 align-self:stretch + 內容 justify-between，底部 chip-accent 貼齊卡底消除死白。
- slide_03.html — 全部 pill 統一 3px 11px padding；Bento 列高微調為 208/180 騰出空間，讓「ROS 2 概念映射」改為卡內左上 kicker 標籤兩行結構貼合網格；`→` 箭頭升至 14.5px/600 橙色、`·` 分隔點 14px/600 橙色、vdiv 改 accent-line；卡片次要文字全部升至 13px。
- slide_05.html — 五層 band 內 tag/chip 統一 12.5px（HAL「三驅動／統一介面」註記由 10.5–11px 升至 12.5px muted）；連接符改 20px/700 橙色 ▾、間距壓至 14px；右側決策卡 line-height 1.65、卡間 gap 14→18px。
- slide_07.html — 3D 截圖加 filter brightness(1.28) contrast(1.06) saturate(1.05)；說明膠囊改 flex-shrink:0 全欄寬（截圖 flex:1 自適應），刪「定義完全」贅詞、陣列 `[0, 0.10, 0, 0.55, 0, 0, 0]` mono nowrap 單行；右欄四卡 icon 統一 22px、容器統一 40×40。

---

## Task ID: ppt-fix-c
**Agent:** ppt-expert fix C

- slide_14.html — 四欄卡統一為固定 44px 圖示列（flex 置中）+ 獨立標題行，外層 row 改 align-items:stretch、網格 align-items:start + 1fr 單軌 + 卡片 h-full，四張卡等高 453px 且四個圖示 top 全部對齊 y=188（驗證通過），技術項目全文原樣保留、條目改 space-evenly 分佈填滿卡身。
- slide_15.html — 中期/遠期各三項補上 12.5px muted 短說明（開合/力道回報整合到指令集等），第一欄 3D IK 描述修剪為 2 行（TCP 末端執行器、逆運動學、UR Teach Pendant / RoboDK、設定次數或無限循環、到期自動失效全數保留），並以三欄對齊的『近期 NEXT → 中期 MID → 遠期 FUTURE』方向條（20px 橙色箭頭 + 連接線）取代原本弱小的近→遠指示。
- slide_16.html — 底部 CTA 條改為全寬實心 var(--surface) 面板 + 1px var(--line) 邊框、z-index:20 穩定壓在右側全高圖上；圖片疊加全幅 rgba(11,14,19,.35) 暗色 scrim + 左緣漸層加強為 #0B0E13 實心至 32%、60% 處淡出，所有文字仍限左欄（標題右緣 784px < 圖片起點 819px）。

三頁均通過無頭瀲覽器 DOM 度量（1280×720、overflow:hidden、零內容溢出、等高對齉）與 VLM 視覺 QA（三頁 PASS）。

---
## Task ID: ppt-fix-b
**Agent:** ppt-expert fix B

- **slide_06.html（即時控制）**： 換上 620×358 近原生比例的 shot-control-detail.png 特寫，指令 chips 升級為 13px mono、7px 14px padding 的「指令集 · 7 COMMANDS」卡片條，規格表每行加 var(--line) 分隔線並補齊全部 7 格 N·m 扭矩單位，左右兩欄頂邊對齊、底部僅差 2px（實測 654 vs 656）。
- **slide_08.html（軌跡錄製與回放）**： 雙截圖改為 1152×218 全寬 shot-traj-hero.png 橫幅（原生 5.28:1）配『錄製中 — 計時 / 點數 / 20Hz 採樣即時顯示』標籤，三步卡片 align-items:stretch 等高 136px（步驟② 精簡為兩行內），安全帶圓角統一為 14px，垂直節奏由 3 個 40px 等高分隔彈性吸收，總高實測 676 + 44 padding ≤ 720。
- **slide_09.html（安全設計）**： 重構為標題 → 五張 219×140 等寬防護卡（01–05 改 mono 灰色、統一 20px filled Material icons：rule/waves/emergency/admin_panel_settings/fact_check，均已驗證連字生效）→ 1104×360 全寬 shot-logs-hero.png 審計日誌橫幅 + 置中說明，無溢出、截圖放大至 0.83x 原生比例。

---
Task ID: 4
Agent: Main Agent (Z.ai)
Task: 世界級水準 PPT — R1-7A 機械臂控制平台工程簡報（專業 ppt-expert 渲染 + AI 專家雙輪評審）

Work Log:
- 證據收集：三服務運行中實時截圖 7 張（agent-browser 1440×900）— Dashboard 帶實時軌跡數據、3D 視圖含綠色軌跡線（VLM 驗證）、Control 滑條、軌跡錄製中/已保存、API Keys、Logs；觸發真實 goto 指令令截圖含真實遙測
- 事實核實：robot-model.ts 七軸規格（行程/扭矩/home 值）、18 REST 端點、3 WS topics、驗證數據（誤差 0、9.6Hz、0 console errors）、部署包內容（bridge 269 行、systemd×4、udev、DEPLOY.md）
- 設計系統：Industrial Dark Premium（#0B0E13 石墨黑 + #FF6B1A 安全橙 + #4CC9F0 遙測青；Space Grotesk + IBM Plex Sans/Mono + Noto Sans TC）— global.css + slides_brief.json 16 頁結構（封面/挑戰/平台/章節一/架構/控制/3D/軌跡/安全/API/章節二/驗證/部署/技術棧/路線圖/結語）
- 渲染：3 個 ppt-expert 並行分組（1-6/7-11/12-16）產出 16 頁 HTML
- AI 專家評審第一輪（VLM glm-5v，4 批）：發現 11 項缺陷 — 封面圖硬邊、Card 01 技術串過密、3D 過暗、控制/軌跡/日誌截圖不可讀（關鍵）、技術棧 icon 錯位、路線圖密度失衡、結語 CTA 疊壓等
- 修復：PIL 精準裁切 3 張近原生比例細節圖（slider detail 720×423、軌跡 hero 1425×270、審計 hero 1325×432，VLM 裁切 QA 通過）；3 個修復 agent 並行執行 11 項精準修復；slides_brief.json 同步更新
- 發現並修復審查流程 bug：review 截圖 viewport 縮水至 1280×577（底部 143px 從未被審）→ 重設 viewport 全 16 頁重截 1280×720 複審
- 第二輪全畫布評審：13/16 PASS，3 項邊緣旗標經 DOM 幾何測量證實為 VLM 誤報（CTA bar 實際 668px、L5 實際 628px、tech stack 內容全在 690 內）
- 匯出：batch_html2pptx 16/16 轉換，0 critical 警告 0 overflow；python-pptx 驗證 16 頁 16:9

Stage Summary:
- 交付物：download/R1-7A機械臂控制平台.pptx（16 頁 9.6MB）+ download/slides/（16 HTML 源稿 + global.css + slides_brief.json + 截圖資產，可持續迭代）
- 方法論：真實產品截圖證據 + 經核實工程數據 + 專家渲染 + 兩輪 AI 評審（VLM 視覺 + DOM 幾何交叉驗證）
