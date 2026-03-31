# 🚀 快速安装和数据库检查指南

## ❓ 常见问题解答

### Q1: Flask-SQLAlchemy 不需要本地安装吗？

**答**：需要安装，但分两种情况：

#### ✅ **需要安装的**：
- **Flask-SQLAlchemy Python 包** - 通过 `pip install Flask-SQLAlchemy` 安装
- 这是一个 Python 库，让 Python 代码能够操作数据库

#### ❌ **不需要安装的**：
- **SQLite 数据库服务器** - Python 3 已内置 SQLite 驱动
- 不需要像 MySQL、PostgreSQL 那样单独安装数据库服务器

**类比**：
- Flask-SQLAlchemy = 驱动程序（需要安装）
- SQLite = 发动机（Python 已自带）
- 数据库文件 = 汽油（程序自动创建 .db 文件）

---

## 📦 安装步骤

### 方法 1：一键安装（推荐）

双击运行：
```
install_dependencies.bat
```

这个脚本会自动：
1. ✅ 检查 Python 安装
2. ✅ 创建虚拟环境 (.venv)
3. ✅ 激活虚拟环境
4. ✅ 安装所有依赖包

### 方法 2：手动安装

```bash
# 1. 创建虚拟环境
python -m venv .venv

# 2. 激活虚拟环境（Windows）
.venv\Scripts\activate

# Mac/Linux:
# source .venv/bin/activate

# 3. 安装依赖
pip install -r requirements.txt

# 4. 验证安装
pip list | findstr Flask
```

应该看到：
```
Flask              3.0.0
Flask-SQLAlchemy   3.1.1
Flask-WTF          1.2.1
```

---

## 🔍 如何查看数据是否正确？

### 方法 1：使用检查脚本（最简单）

```bash
# 1. 确保虚拟环境已激活
.venv\Scripts\activate

# 2. 运行检查脚本
python check_database.py
```

**输出示例**：
```
============================================================
📊 DecoFinance 数据库检查工具
============================================================

📍 数据库连接：sqlite:///renovation_credit_v2.db
📁 可能位置 1: D:\...\instance\renovation_credit_v2.db
📁 可能位置 2: models\renovation_credit_v2.db

💾 数据库文件：D:\...\instance\renovation_credit_v2.db
   状态：✅ 存在
   大小：128,000 字节 (125.00 KB)

📋 数据库表列表 (共 12 个):
   - audit_logs (7 列)
   - companies (52 列)
   - consent_records (8 列)
   - credit_scores (24 列)
   - dispute_cases (10 列)
   - escrow_ledger_entries (11 列)
   - loan_applications (27 列)
   - project_bids (10 列)
   - project_milestones (14 列)
   - projects (14 列)
   - smart_contract_agreements (18 列)
   - users (9 列)

📈 数据统计:
   ✅ 👤 用户：5 条
   ✅ 🏢 公司：10 条
   ✅ 📊 信用评分：10 条
   ✅ 💰 贷款申请：3 条
   ✅ 📁 项目：2 条
   ⚠️  ⚖️ 纠纷案例：0 条

📝 最新记录预览:
   🏢 最新公司：ABC Decoration Ltd (ID: 10)
   👤 最新用户：admin (角色：admin)
   📊 最新评分：850 分 (等级：AAA)

🔍 数据完整性检查:
   ✅ 所有公司都有信用评分
   ⏳ 2 个待处理的贷款申请

============================================================
✅ 数据库检查完成
============================================================
```

---

### 方法 2：使用图形化工具（推荐新手）

#### 下载 DB Browser for SQLite

1. **下载地址**：https://sqlitebrowser.org/dl/
2. **或使用 Chocolatey**（如果已安装）：
   ```bash
   choco install db-browser-for-sqlite
   ```

3. **打开数据库文件**：
   - 启动 DB Browser for SQLite
   - 点击 "Open Database"
   - 找到文件：`d:\chengyou\workspace2\demo-1\renovation-credit-system\instance\renovation_credit_v2.db`
   - 或：`models\renovation_credit.db`

4. **查看数据**：
   - 点击 "Browse Data" 标签
   - 选择表名（如 `companies`）
   - 查看所有记录

---

### 方法 3：通过 Web 界面查看

```bash
# 1. 激活虚拟环境
.venv\Scripts\activate

# 2. 初始化数据库（如果还没有数据）
python seed_db.py

# 3. 启动应用
python app.py
```

然后访问：
- **首页**：http://localhost:5001
- **公司列表**：http://localhost:5001/companies
- **仪表板**：http://localhost:5001/dashboard
- **API 数据**：http://localhost:5001/api/companies

---

## 🛠️ 常见问题解决

### 问题 1：ModuleNotFoundError: No module named 'flask_sqlalchemy'

**原因**：虚拟环境未激活或依赖未安装

**解决方法**：
```bash
# 1. 激活虚拟环境
.venv\Scripts\activate

# 2. 检查是否激活成功（命令行前应有 (.venv) 标识）

# 3. 重新安装依赖
pip install -r requirements.txt
```

---

### 问题 2：数据库文件不存在

**原因**：数据库未初始化

**解决方法**：
```bash
# 激活虚拟环境后
.venv\Scripts\activate

# 初始化数据库
python -c "from app import create_app; from models.database import db; app = create_app(); app.app_context().push(); db.create_all(); print('数据库已创建')"

# 或使用 seed 脚本填充测试数据
python seed_db.py
```

---

### 问题 3：表不存在或数据为空

**原因**：数据库表未创建或未填充数据

**解决方法**：
```bash
.venv\Scripts\activate
python seed_db.py
python check_database.py
```

---

## 📋 完整检查清单

安装完成后，按顺序检查：

- [ ] **Python 已安装**：`python --version` 应显示 3.8+
- [ ] **虚拟环境已创建**：项目根目录有 `.venv` 文件夹
- [ ] **虚拟环境已激活**：命令行前有 `(.venv)` 标识
- [ ] **依赖已安装**：`pip list` 能看到 Flask-SQLAlchemy
- [ ] **数据库已初始化**：运行 `python seed_db.py` 无错误
- [ ] **数据已填充**：运行 `python check_database.py` 显示数据
- [ ] **应用能启动**：运行 `python app.py` 能访问 http://localhost:5001

---

## 💡 小贴士

### 1. 虚拟环境的重要性

```bash
# ❌ 错误：不使用虚拟环境
pip install -r requirements.txt  # 可能污染全局 Python 环境

# ✅ 正确：使用虚拟环境
.venv\Scripts\activate
pip install -r requirements.txt  # 包只安装在 .venv 中
```

### 2. 查看数据库文件位置

在 Python 中：
```python
from app import create_app
app = create_app()
print(app.config['SQLALCHEMY_DATABASE_URI'])
```

### 3. 备份数据库

直接复制 `.db` 文件即可：
```bash
copy instance\renovation_credit_v2.db backup_20260324.db
```

### 4. 重置数据库

```bash
# 删除旧数据库
del instance\renovation_credit_v2.db

# 重新创建并填充
python seed_db.py
```

---

## 📞 需要帮助？

如果遇到问题：

1. **检查 Python 版本**：`python --version` 应为 3.8 或更高
2. **确保虚拟环境激活**：命令行前应有 `(.venv)`
3. **查看详细错误**：运行 `python check_database.py` 查看完整错误信息
4. **检查防火墙**：确保 localhost:5001 未被阻止

---

**最后更新**：2026-03-24
