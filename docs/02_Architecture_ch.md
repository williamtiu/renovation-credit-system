# DecoFinance 系统架构

## 1. 架构摘要

DecoFinance 实现为带有 SQLAlchemy 模型和角色感知路由保护的 Flask 单体应用。它现在运行双 UI 模式：

- 主路由上的传统服务器渲染 Jinja UI；
- Flask 在 /new-ui 下服务的 React UI 构建。

```text
浏览器
  |
  +-- Flask Jinja 路由（传统 UI）
  +-- /new-ui（React 构建，由 Flask 服务）
  |
  v
Flask 蓝图
  |
  +-- auth
  +-- main
  +-- companies
  +-- loans
  +-- projects
  +-- disputes
  +-- admin
  +-- api
  |
  v
服务层
  |
  +-- credit_scorer
  +-- report_service
  +-- project_service
  +-- escrow_service
  +-- dispute_service
  +-- smart_contract_service
  +-- audit_service
  |
  v
SQLAlchemy 模型
  |
  v
SQLite（默认）或其他 SQLAlchemy 支持的关系数据库
```

## 2. 技术选择

| 层 | 技术 | 当前用途 |
|------|------|------|
| Web 框架 | Flask 3 | 应用工厂、蓝图、请求生命周期 |
| 模板 | Jinja2 | 传统 UI 页面和工作流 |
| 新 UI | React + Vite 构建 | 通过 Flask 静态交付在 /new-ui 下服务 |
| ORM | Flask-SQLAlchemy / SQLAlchemy | 模型和查询层 |
| 本地数据库 | SQLite | 默认开发和测试数据库 |
| 测试 | pytest | 后端和路由回归覆盖 |
| 浏览器测试 | Selenium | 端到端 UI 验证 |
| PDF 生成 | ReportLab | 信用报告导出 |

## 3. 主要模块

### 3.1 身份和访问
- 基于会话的身份验证。
- 用于 `customer`、`company_user`、`reviewer` 和 `admin` 的角色感知装饰器。

### 3.2 公司信托领域
- 公司简介管理。
- 合规感知的信托评分。
- 信用报告渲染、比较和 PDF 下载。

### 3.3 贷款领域
- 贷款申请提交。
- 审查员批准或拒绝。
- 拨款和还款跟踪。

### 3.4 项目融资领域
- 客户项目创建。
- 承包商投标提交和接受。
- 里程碑规划、提交和批准。
- 托管状态分类账条目。
- 纠纷和智能合约状态转换。

### 3.5 监控和审计
- 仪表板趋势摘要和观察名单。
- 敏感操作的审计日志。
- 用于系统统计、auth 引导、项目检查和开发者诊断的 JSON API 端点。

### 3.6 新 UI 集成层
- React 构建输出位于 DecoFinance Project Overview/dist 下。
- Flask 主蓝图在 /new-ui 和 /new-ui/<path> 服务此捆绑包，带有 SPA 回退。
- React 应用通过会话支持的 /api/auth 端点进行身份验证。
- 开发者诊断页面使用 /api/developer/summary。

## 4. 智能合约设计

智能合约功能实现为应用层状态机，而非区块链部署。

### 4.1 核心状态
- `draft`（草稿）
- `active`（活跃）
- `milestone_submitted`（里程碑已提交）
- `frozen`（冻结）
- `completed`（已完成）

### 4.2 触发事件
- 项目创建
- 投标接受
- 里程碑创建
- 里程碑提交
- 里程碑批准
- 纠纷开启
- 纠纷解决

## 5. 数据和模式策略

- 模式创建依赖应用启动时的 `db.create_all()`。
- 轻量级模式修补用于需要时处理较旧的本地数据库。
- 当前本地演示使用不需要迁移框架。

## 6. 部署形态

- 通过 python app.py 本地 Flask 进程（端口 5001）。
- Windows 通过 start.bat 启动，Linux/macOS 通过 start.sh 启动。
- 启动脚本在 dist 缺失时可以自动构建 /new-ui 捆绑包。
- 通过 seed_db.py 固定演示数据。
- 通过 generate_random_data.py 和 generate_random_data.bat 批量随机数据。

## 7. 测试架构

- 路由和服务行为由 pytest 覆盖。
- 前端流由 Selenium 覆盖。
- 完整回归运行一起验证后端和 UI 流。

## 8. 版本历史
| 版本 | 日期 | 摘要 |
|------|------|------|
| v1.0 | 2026-03-03 | 初始目标状态架构草案 |
| v1.1 | 2026-03-09 | 重写以匹配已实现的 Flask/Jinja 架构 |
| v1.2 | 2026-03-16 | 与双 UI（/new-ui）、auth JSON 端点和开发者诊断集成同步 |
