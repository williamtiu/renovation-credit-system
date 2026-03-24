# Flask-SQLAlchemy 安装和使用指南

## 📦 一、需要安装什么？

### 需要安装的组件：

| 组件 | 是否需要安装服务器 | 说明 |
|------|-------------------|------|
| **Flask-SQLAlchemy** | ✅ 只需 Python 包 | `pip install Flask-SQLAlchemy` |
| **SQLite** | ❌ 不需要 | Python 内置，无需额外安装 |
| **数据库文件** | ❌ 不需要 | 程序自动创建 `.db` 文件 |

### 安装步骤：

```bash
# 1. 创建虚拟环境（推荐）
python -m venv .venv

# 2. 激活虚拟环境
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Mac/Linux

# 3. 安装项目依赖
pip install -r requirements.txt
```

安装完成后，检查是否成功：

```bash
pip list | findstr Flask-SQLAlchemy
```

应该看到：
```
Flask-SQLAlchemy    3.1.1
```

---

## 🔍 二、如何查看数据是否正确？

### 方法 1：使用数据库查看工具（推荐新手）

#### **DB Browser for SQLite**（图形化界面，最直观）

1. **下载安装**：
   - 官网：https://sqlitebrowser.org/dl/
   - 或使用 Chocolatey：`choco install db-browser-for-sqlite`

2. **打开数据库文件**：
   - 文件位置：`d:\chengyou\workspace2\demo-1\renovation-credit-system\models\renovation_credit.db`
   - 或：`d:\chengyou\workspace2\demo-1\renovation-credit-system\instance\renovation_credit_v2.db`

3. **查看数据**：
   - 点击 "Browse Data" 标签
   - 选择表名（如 `companies`, `users`, `credit_scores`）
   - 查看记录

---

### 方法 2：使用 Python 脚本查看

创建脚本 `check_db.py`：

```python
from models.database import db
from models.company import Company
from models.user import User
from models.credit_score import CreditScore
from app import create_app

app = create_app()

with app.app_context():
    print("=" * 50)
    print("📊 数据库数据检查")
    print("=" * 50)
    
    # 检查公司数量
    company_count = Company.query.count()
    print(f"\n🏢 公司总数：{company_count}")
    
    # 显示前 5 个公司
    companies = Company.query.limit(5).all()
    for company in companies:
        print(f"  - {company.company_name} (ID: {company.id})")
    
    # 检查用户数量
    user_count = User.query.count()
    print(f"\n👤 用户总数：{user_count}")
    
    # 检查信用评分
    score_count = CreditScore.query.count()
    print(f"\n📈 信用评分记录数：{score_count}")
    
    print("\n" + "=" * 50)
```

运行：
```bash
python check_db.py
```

---

### 方法 3：使用 Flask Shell

```bash
# 进入 Flask 交互环境
flask shell

# 在交互环境中查询
>>> from models.company import Company
>>> Company.query.all()
[<Company ABC Decoration>, <Company XYZ Design>, ...]

>>> Company.query.count()
10

>>> company = Company.query.first()
>>> company.company_name
'ABC Decoration'
```

---

### 方法 4：通过 Web 界面查看

启动应用后访问：

```bash
python app.py
```

然后访问：
- **公司列表**：http://localhost:5001/companies
- **仪表板**：http://localhost:5001/dashboard
- **API 端点**：http://localhost:5001/api/companies（返回 JSON 数据）

---

## 🛠️ 三、常见问题排查

### 问题 1：找不到数据库文件

**检查数据库路径**：

```python
# 在 app.py 中添加调试输出
with app.app_context():
    print(f"Database URI: {app.config['SQLALCHEMY_DATABASE_URI']}')
    print(f"Database path: {db.engine.url.database}")
```

**手动初始化数据库**：

```bash
python -c "from app import create_app; from models.database import db; app = create_app(); app.app_context().push(); db.create_all(); print('Database initialized!')"
```

---

### 问题 2：表不存在

**重新创建所有表**：

```bash
python -c "
from app import create_app
from models.database import db

app = create_app()
with app.app_context():
    db.drop_all()  # 删除所有表
    db.create_all()  # 重新创建
    print('✅ 数据库表已重新创建')
"
```

⚠️ **警告**：这会删除所有数据！

---

### 问题 3：数据不显示

**检查是否提交了会话**：

```python
# 错误示例 - 数据不会保存
new_company = Company(company_name='Test')
db.session.add(new_company)
# 缺少 db.session.commit()

# 正确示例
new_company = Company(company_name='Test')
db.session.add(new_company)
db.session.commit()  # ✅ 必须提交
```

**使用 seed 脚本填充测试数据**：

```bash
python seed_db.py
```

---

## 📋 四、数据库文件位置

项目中有两个可能的数据库文件位置：

1. **开发环境**（默认）：
   ```
   d:\chengyou\workspace2\demo-1\renovation-credit-system\models\renovation_credit.db
   ```

2. **配置文件中指定**：
   ```
   d:\chengyou\workspace2\demo-1\renovation-credit-system\instance\renovation_credit_v2.db
   ```

**查看实际使用的数据库**：

```python
from app import create_app
app = create_app()
print(app.config['SQLALCHEMY_DATABASE_URI'])
```

---

## 🎯 五、快速验证清单

- [ ] 已安装 Python 3.8+
- [ ] 已创建虚拟环境（推荐）
- [ ] 已运行 `pip install -r requirements.txt`
- [ ] 已运行 `python seed_db.py` 初始化数据
- [ ] 可以访问 http://localhost:5001
- [ ] 可以看到公司列表页面
- [ ] 已安装 DB Browser for SQLite（可选，用于直接查看）

---

## 💡 小贴士

1. **虚拟环境很重要**：避免包冲突
2. **定期备份数据库**：复制 `.db` 文件即可
3. **使用内存数据库测试**：`sqlite:///:memory:`
4. **查看 SQL 日志**：设置 `SQLALCHEMY_ECHO=True` 可以看到所有执行的 SQL 语句

```python
# 在 config.py 中添加
SQLALCHEMY_ECHO = True  # 输出所有 SQL 到控制台
```
