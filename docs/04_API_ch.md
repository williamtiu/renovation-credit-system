# DecoFinance API 接口文档

## 1. 概述

### 1.1 基础路径
所有 JSON 端点都在 /api 下。

### 1.2 响应封装
成功：

```json
{
  "success": true,
  "data": {}
}
```

失败：

```json
{
  "success": false,
  "error": "message"
}
```

### 1.3 身份验证和授权
使用会话 cookie 身份验证。

- 未认证：401
- 非活跃账户：403
- 角色不匹配：403

## 2. 身份验证端点

- GET /api/auth/me
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/register

说明：

- register 角色白名单限制为 customer 和 company_user。
- login 接受标识符（用户名或电子邮件）加密码。

登录请求示例：

```json
{
  "identifier": "customer@test.com",
  "password": "password123"
}
```

## 3. 公司和评分端点

- GET /api/companies
- POST /api/companies
- GET /api/companies/{id}
- POST /api/companies/{id}/score
- GET /api/credit-scores（管理员/审查员）

访问摘要：

- GET companies 和公司详情需要登录。
- POST company 创建需要管理员/审查员/公司用户。
- 评分重新计算需要公司管理权限。

## 4. 贷款和投资组合端点

- GET /api/loans（管理员/审查员）
- GET /api/stats（管理员/审查员）
- GET /api/disputes（管理员/审查员）

Stats 负载包括：

- total_companies
- active_companies
- total_loans
- approved_loans
- pending_loans
- total_credit_scores
- total_projects
- open_projects
- total_disputes
- grade_distribution

## 5. 项目和合约端点

- GET /api/projects
- GET /api/projects/{id}/bids
- GET /api/projects/{id}/milestones
- GET /api/projects/{id}/contract

访问摘要：

- 客户：自己的项目
- 公司用户：开放投标的项目或公司已参与的项目
- 审查员/管理员：所有项目

合约端点行为：

- 返回项目智能合约快照
- 如果缺失则延迟初始化项目合约

## 6. 开发者诊断端点

- GET /api/developer/summary

返回：

- 当前时间戳
- 当前会话用户负载
- 聚合计数（公司/项目/贷款/纠纷/信用评分）
- 新 UI 开发者页面使用的记录 API 端点列表

## 7. UI 工作流使用的 Web 路由

不是 JSON API，但是用户旅程的关键路由：

- /auth/register
- /auth/login
- /dashboard
- /companies/compare-report
- /companies/{id}/credit-report
- /companies/{id}/credit-report/download
- /projects/
- /projects/add
- /projects/{id}/edit
- /disputes/
- /admin/audit-logs
- /new-ui/

## 8. 工作流保护规则

当前强制执行的保护包括：

- 每个项目只接受一个投标
- 里程碑只能在项目签约/进行中后创建
- 只有已接受的承包商才能提交里程碑
- 有开放纠纷的已提交里程碑不能批准
- 项目列表/详情 API 强制执行所有权或参与过滤器

## 9. 版本历史
| 版本 | 日期 | 摘要 |
|------|------|------|
| v1.0 | 2026-03-03 | 初始目标状态 API 草案 |
| v1.1 | 2026-03-09 | 当前 /api 路由和合约端点文档 |
| v1.2 | 2026-03-16 | 添加 auth JSON 端点、开发者摘要端点和双 UI 说明 |
