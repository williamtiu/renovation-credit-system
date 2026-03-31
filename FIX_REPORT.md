# 问题修复报告

## 🐛 问题描述

**错误信息**：
```
werkzeug.routing.exceptions.BuildError: Could not build url for endpoint 'companies.detail' with values ['id']. Did you mean 'companies.delete_company' instead?
```

**问题位置**：
- 文件：`templates/zh/dashboard.html`
- 行号：195
- 页面：首页 → 中文版本 → 监控列表公司

**错误原因**：
在监控列表公司部分，使用了错误的端点名称 `companies.detail`，但实际的路由端点名称是 `companies.view_company`。

---

## ✅ 修复方案

### 修改内容

**文件**：`templates/zh/dashboard.html`

**修改前**（第 195 行）：
```html
<a href="{{ url_for('companies.detail', id=company.id) }}">
    {{ company.company_name }}
</a>
```

**修改后**：
```html
<a href="{{ url_for('companies.view_company', id=company.id) }}">
    {{ company.company_name }}
</a>
```

### 修复说明

1. **端点名称更正**：
   - ❌ 错误：`companies.detail`
   - ✅ 正确：`companies.view_company`

2. **对应的路由定义**（`routes/companies.py` 第 540 行）：
   ```python
   @companies_bp.route('/<int:id>')
   def view_company(id):
       # ...
   ```

3. **页面功能**：
   - 点击公司名称后，会跳转到公司详情页面
   - 显示公司的完整信息、信用报告、贷款申请等

---

## 📋 相关路由端点参考

以下是公司相关的所有可用端点：

| 端点名称 | URL 路径 | 功能 |
|---------|---------|------|
| `companies.list_companies` | `/companies/` | 公司列表 |
| `companies.view_company` | `/companies/<id>` | 公司详情 |
| `companies.add_company` | `/companies/add` | 添加公司 |
| `companies.edit_company` | `/companies/<id>/edit` | 编辑公司 |
| `companies.delete_company` | `/companies/<id>/delete` | 删除公司 |
| `companies.view_credit_report` | `/companies/<id>/credit-report` | 信用报告 |
| `companies.download_credit_report` | `/companies/<id>/credit-report/download` | 下载报告 |
| `companies.compare_reports` | `/companies/compare-report` | 对比报告 |

---

## 🔍 其他检查

已检查以下文件，确认没有类似问题：

- ✅ `templates/dashboard.html` (英文版) - 使用正确的端点
- ✅ `templates/zh/index.html` - 无公司详情链接
- ✅ `templates/zh/companies/list.html` - 使用正确的端点
- ✅ `templates/zh/companies/detail.html` - 本身就是详情页

---

## 🧪 测试建议

修复后，请测试以下场景：

1. **访问首页**：
   - URL: http://localhost:5001/
   - 语言：中文
   - 检查：页面底部"监控列表公司"部分

2. **点击公司名称**：
   - 操作：点击监控列表中的任意公司名称
   - 预期：成功跳转到公司详情页面

3. **检查其他链接**：
   - 确保所有公司相关链接都能正常工作

---

## 📝 修复时间

- **发现时间**：2026-03-24
- **修复时间**：2026-03-24
- **修复文件**：1 个
- **修改行数**：1 行

---

## ✅ 状态

**修复状态**：✅ 已完成

**下一步**：
1. 安装依赖（如果还没安装）：
   ```bash
   .venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. 重启应用：
   ```bash
   python app.py
   ```

3. 访问首页测试修复效果

---

**修复人员**：AI Assistant  
**最后更新**：2026-03-24
