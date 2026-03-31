# 🔄 评分体系升级迁移指南

## 📋 迁移概述

本指南介绍DecoFinance项目完全采用新的4大维度评分体系的完整流程。

---

## 🎯 升级内容

### 旧评分体系（v1.0）- 已废弃
- **6个维度**：财务实力、运营稳定、信用历史、资质、行业风险、合规调整
- **总分范围**：0-1000分
- **信用等级**：AAA-C（7级）
- **主要问题**：
  - 合规调整分逻辑复杂
  - 缺少客户评价维度
  - 财务指标不够全面
- **状态**：❌ 已废弃，不再使用

### 新评分体系（v2.0）- 当前版本
- **4个核心维度**：财务实力、运营稳定、资质认证、客户评价
- **总分范围**：0-1000分（保持一致）
- **信用等级**：AAA-C（7级，保持一致）
- **主要改进**：
  - 结构更清晰，4个维度各司其职
  - 财务实力评分更全面（5个财务指标）
  - 新增客户评价维度（300分）
  - 资质认证更强调必须项验证
- **状态**：✅ 当前版本，完全采用

---

## 📦 新增数据库字段

### 财务指标字段
| 字段名 | 类型 | 说明 | 默认值 |
|--------|------|------|--------|
| `current_assets` | FLOAT | 流动资产 | 0.0 |
| `current_liabilities` | FLOAT | 流动负债 | 0.0 |
| `total_cash` | FLOAT | 现金总额 | 0.0 |
| `total_liabilities` | FLOAT | 总负债 | 0.0 |
| `shareholders_equity` | FLOAT | 股东权益 | 0.0 |
| `audited_financials_uploaded` | BOOLEAN | 是否上传经审计财务报表 | FALSE |
| `tax_returns_uploaded` | BOOLEAN | 是否上传纳税申报表 | FALSE |

### 资质认证字段
| 字段名 | 类型 | 说明 | 默认值 |
|--------|------|------|--------|
| `minor_works_contractor_registration` | VARCHAR(100) | 小型工程承建商注册号 | NULL |
| `minor_works_registration_verified` | BOOLEAN | 小型工程注册验证状态 | FALSE |
| `insurance_documents_uploaded` | BOOLEAN | 保险文件是否上传 | FALSE |
| `insurance_verified` | BOOLEAN | 保险验证状态 | FALSE |
| `osh_safety_officer_license` | VARCHAR(100) | OSH安全主任执照号 | NULL |
| `osh_safety_officer_verified` | BOOLEAN | OSH安全主任验证状态 | FALSE |

---

## 🚀 迁移步骤

### 方案A：全新安装（推荐）

如果这是全新安装，直接使用更新后的代码即可：

```bash
# 1. 克隆最新代码
git pull origin main

# 2. 运行数据库初始化（会自动创建新字段）
python seed_db.py

# 3. 验证数据
python check_database.py
```

### 方案B：从旧系统迁移

如果已有旧系统数据，需要运行迁移脚本：

```bash
# 1. 备份数据库
mysqldump -u root -p renovation_credit_system > backup_before_upgrade.sql

# 2. 运行迁移脚本添加新字段
python add_new_fields.py

# 3. 更新现有公司数据（可选）
# 如果已有公司数据，需要更新财务指标和资质认证字段
# 参考 seed_db.py 中的示例数据格式

# 4. 重新计算所有公司评分
python recompute_all_scores.py
```

### 步骤2：验证数据库字段
```bash
# 备份数据库
mysqldump -u root -p renovation_credit_system > backup_before_upgrade.sql
```

### 步骤2：运行迁移脚本
```bash
# 运行迁移脚本添加新字段
python add_new_fields.py
```

**预期输出**：
```
============================================================
DecoFinance 评分体系升级 - 数据库迁移脚本
============================================================

开始添加新字段...
✓ 已添加字段: current_assets
✓ 已添加字段: current_liabilities
✓ 已添加字段: total_cash
✓ 已添加字段: total_liabilities
✓ 已添加字段: shareholders_equity
✓ 已添加字段: audited_financials_uploaded
✓ 已添加字段: tax_returns_uploaded
✓ 已添加字段: minor_works_contractor_registration
✓ 已添加字段: minor_works_registration_verified
✓ 已添加字段: insurance_documents_uploaded
✓ 已添加字段: insurance_verified
✓ 已添加字段: osh_safety_officer_license
✓ 已添加字段: osh_safety_officer_verified

✓ 所有新字段添加成功!
```

### 步骤3：验证数据库字段
```bash
# 连接数据库验证字段
mysql -u root -p renovation_credit_system -e "DESCRIBE companies;"
```

**检查字段是否存在**：
```
+-----------------------------------+--------------+------+-----+---------+----------------+
| Field                             | Type         | Null | Key | Default | Extra          |
+-----------------------------------+--------------+------+-----+---------+----------------+
| ...                               | ...          | ...  | ... | ...     | ...            |
| current_assets                    | double       | YES  |     | NULL    |                |
| current_liabilities               | double       | YES  |     | NULL    |                |
| total_cash                        | double       | YES  |     | NULL    |                |
| total_liabilities                 | double       | YES  |     | NULL    |                |
| shareholders_equity               | double       | YES  |     | NULL    |                |
| audited_financials_uploaded       | tinyint(1)   | YES  |     | 0       |                |
| tax_returns_uploaded              | tinyint(1)   | YES  |     | 0       |                |
| minor_works_contractor_registration| varchar(100) | YES  |     | NULL    |                |
| minor_works_registration_verified | tinyint(1)   | YES  |     | 0       |                |
| insurance_documents_uploaded      | tinyint(1)   | YES  |     | 0       |                |
| insurance_verified                | tinyint(1)   | YES  |     | 0       |                |
| osh_safety_officer_license        | varchar(100) | YES  |     | NULL    |                |
| osh_safety_officer_verified       | tinyint(1)   | YES  |     | 0       |                |
+-----------------------------------+--------------+------+-----+---------+----------------+
```

### 步骤4：重新计算所有公司评分
```bash
# 运行重新计算脚本
python recompute_all_scores.py
```

**预期输出**：
```
============================================================
重新计算所有公司评分
============================================================

开始计算评分...
公司 1: Total Score = 756 (Grade: AAA)
公司 2: Total Score = 689 (Grade: A)
公司 3: Total Score = 543 (Grade: B)
...
✓ 所有公司评分已更新!
```

### 步骤5：验证评分结果
```bash
# 检查评分结果
python check_scores.py
```

---

## 📊 评分对比

### 评分结构对比

| 维度 | 旧体系 | 新体系 | 变化 |
|------|--------|--------|------|
| **财务实力** | 150-300分 | 150-600分 | +150分 |
| **运营稳定** | 80-250分 | 80-250分 | 无变化 |
| **信用历史** | 80-240分 | 已整合 | 已移除 |
| **资质** | 0-115分 | 0-200分 | +85分 |
| **行业风险** | 30-85分 | 已整合 | 已移除 |
| **合规调整** | -100至+100分 | 已整合 | 已移除 |
| **客户评价** | 0分 | 60-300分 | +240分 |
| **总计** | - | 0-1000分 | 保持一致 |

### 新评分计算示例

**示例公司数据**：
- 注册资本：2000万 HKD
- 年营收：8000万 HKD
- 流动比率：1.8
- 现金比率：1.5
- 债务权益比：0.8
- 成立年限：8年
- 完成项目：60个
- 员工人数：35人
- 商业注册：✓
- 小型工程注册：✓（已验证）
- 保险：✓（已上传+验证）
- OSH安全主任：✓（已验证）
- ISO认证：✓
- 客户平均评分：4.2
- 主观评估：75分

**评分计算**：

1. **财务实力** (600分)
   - 注册资本：120分（2000万）
   - 年营收：150分（8000万）
   - 流动比率：150分（1.8 > 1.6）
   - 现金比率：150分（1.5 >= 1.1）
   - 债务权益比：150分（0.8 < 1）
   - **小计：720分 → 限制为600分**

2. **运营稳定** (250分)
   - 成立年限：80分（8年）
   - 完成项目：80分（60个）
   - 员工人数：40分（35人）
   - **小计：200分**

3. **资质认证** (200分)
   - 商业注册：50分
   - 小型工程注册：50分（已验证）
   - 保险状态：50分（已验证）
   - OSH安全主任：50分（已验证）
   - ISO认证：50分
   - **小计：250分 → 限制为200分**

4. **客户评价** (300分)
   - 客户评分：126分（4.2分）
   - 主观评估：75分
   - **小计：201分**

**总分**：600 + 200 + 200 + 201 = **1201 → 限制为1000分**

**信用等级**：AAA（751-1000分）

---

## ⚠️ 注意事项

### 1. 数据完整性
- 所有新字段默认为 NULL 或 FALSE
- 评分器会处理空值情况（使用默认分）
- 建议逐步完善公司数据

### 2. 评分兼容性
- 新评分体系总分范围仍为 0-1000分
- 信用等级划分保持不变（AAA-C）
- 旧评分数据仍然有效，但不包含新字段

### 3. 前端适配
- 前端页面仍显示旧评分（1000-4000分）
- 需要更新前端以支持新评分（0-1000分）
- 建议创建新的评分展示组件

### 4. API兼容性
- 后端API保持兼容
- 返回的评分字段名保持一致
- 新增字段通过`to_dict()`方法返回

---

## 📝 数据迁移建议

### 短期（1-2周）
1. ✅ 运行数据库迁移脚本
2. ✅ 重新计算所有公司评分
3. ✅ 验证评分结果
4. ⏳ 更新前端页面显示新评分

### 中期（1-2月）
1. ⏳ 更新前端评分展示组件
2. ⏳ 添加新字段的数据录入界面
3. ⏳ 更新评分报告模板

### 长期（3-6月）
1. ⏳ 收集客户评价数据
2. ⏳ 优化评分权重
3. ⏳ 引入机器学习模型

---

## 🛠️ 故障排除

### 问题1：字段已存在
**错误信息**：
```
ERROR 1060 (42S21): Duplicate column name 'current_assets'
```

**解决方案**：
```bash
# 检查字段是否已存在
mysql -u root -p renovation_credit_system -e "DESCRIBE companies LIKE 'current_assets';"

# 如果存在，跳过该字段
# 运行迁移脚本时会自动跳过已存在的字段
```

### 问题2：评分计算失败
**错误信息**：
```
ZeroDivisionError: division by zero
```

**解决方案**：
```bash
# 检查公司数据完整性
python -c "
from models.database import db
from models.company import Company

companies = Company.query.all()
for c in companies:
    if not c.current_liabilities or c.current_liabilities == 0:
        print(f'公司 {c.id}: current_liabilities 为0或NULL')
"

# 修复数据
python -c "
from models.database import db
from models.company import Company

companies = Company.query.filter(Company.current_liabilities == 0).all()
for c in companies:
    c.current_liabilities = 1  # 设置为1避免除零错误
db.session.commit()
print('已修复除零问题')
"
```

### 问题3：前端显示旧评分
**症状**：前端页面仍显示1000-4000分的评分

**解决方案**：
1. 检查前端评分组件
2. 更新评分范围映射
3. 清除浏览器缓存

---

## 📞 支持

如有问题，请联系：
- 技术支持：tech@decofinance.com
- 产品团队：product@decofinance.com

---

**文档版本**：v1.0  
**更新日期**：2026-03-24  
**适用版本**：DecoFinance v2.0
