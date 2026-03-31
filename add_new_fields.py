#!/usr/bin/env python
"""
数据库迁移脚本 - 添加新的评分体系字段
运行方式: python add_new_fields.py
"""

from models.database import db, engine
from sqlalchemy import text

def add_new_fields():
    """
    添加新的评分体系字段到companies表
    """
    print("开始添加新字段...")
    
    # 连接数据库
    with engine.connect() as conn:
        # 开始事务
        trans = conn.begin()
        try:
            # 新增财务指标字段
            fields_to_add = [
                # 财务指标
                ("current_assets", "FLOAT DEFAULT NULL COMMENT '流动资产'"),
                ("current_liabilities", "FLOAT DEFAULT NULL COMMENT '流动负债'"),
                ("total_cash", "FLOAT DEFAULT NULL COMMENT '现金总额'"),
                ("total_liabilities", "FLOAT DEFAULT NULL COMMENT '总负债'"),
                ("shareholders_equity", "FLOAT DEFAULT NULL COMMENT '股东权益'"),
                ("audited_financials_uploaded", "BOOLEAN DEFAULT FALSE COMMENT '是否上传经审计的财务报表'"),
                ("tax_returns_uploaded", "BOOLEAN DEFAULT FALSE COMMENT '是否上传纳税申报表'"),
                # 资质与认证字段
                ("minor_works_contractor_registration", "VARCHAR(100) DEFAULT NULL COMMENT '小型工程承建商注册号'"),
                ("minor_works_registration_verified", "BOOLEAN DEFAULT FALSE COMMENT '小型工程注册验证状态'"),
                ("insurance_documents_uploaded", "BOOLEAN DEFAULT FALSE COMMENT '保险文件是否上传'"),
                ("insurance_verified", "BOOLEAN DEFAULT FALSE COMMENT '保险验证状态'"),
                ("osh_safety_officer_license", "VARCHAR(100) DEFAULT NULL COMMENT 'OSH安全主任执照号'"),
                ("osh_safety_officer_verified", "BOOLEAN DEFAULT FALSE COMMENT 'OSH安全主任验证状态'"),
            ]
            
            # 检查并添加字段
            for field_name, field_def in fields_to_add:
                # 检查字段是否已存在
                check_sql = f"""
                SELECT COUNT(*) 
                FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'companies' 
                AND COLUMN_NAME = '{field_name}'
                """
                result = conn.execute(text(check_sql))
                exists = result.scalar()
                
                if exists == 0:
                    # 字段不存在，添加字段
                    alter_sql = f"ALTER TABLE companies ADD COLUMN {field_name} {field_def}"
                    conn.execute(text(alter_sql))
                    print(f"✓ 已添加字段: {field_name}")
                else:
                    print(f"○ 字段已存在: {field_name}")
            
            # 提交事务
            trans.commit()
            print("\n✓ 所有新字段添加成功!")
            
        except Exception as e:
            # 回滚事务
            trans.rollback()
            print(f"\n✗ 添加字段时出错: {str(e)}")
            raise

if __name__ == '__main__':
    print("=" * 60)
    print("DecoFinance 评分体系升级 - 数据库迁移脚本")
    print("=" * 60)
    print()
    
    try:
        add_new_fields()
        print()
        print("迁移完成！")
        print()
        print("新增字段说明:")
        print("-" * 60)
        print("财务指标:")
        print("  • current_assets: 流动资产")
        print("  • current_liabilities: 流动负债")
        print("  • total_cash: 现金总额")
        print("  • total_liabilities: 总负债")
        print("  • shareholders_equity: 股东权益")
        print("  • audited_financials_uploaded: 是否上传经审计财务报表")
        print("  • tax_returns_uploaded: 是否上传纳税申报表")
        print()
        print("资质与认证:")
        print("  • minor_works_contractor_registration: 小型工程承建商注册号")
        print("  • minor_works_registration_verified: 小型工程注册验证状态")
        print("  • insurance_documents_uploaded: 保险文件是否上传")
        print("  • insurance_verified: 保险验证状态")
        print("  • osh_safety_officer_license: OSH安全主任执照号")
        print("  • osh_safety_officer_verified: OSH安全主任验证状态")
        print()
        print("注意: 迁移后需要重新计算所有公司的评分")
        print("运行: python recompute_all_scores.py")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n迁移失败: {str(e)}")
        print("请检查数据库连接和权限")
        exit(1)
