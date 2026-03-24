"""
数据库检查工具
用于查看数据库状态和数据内容
"""

from app import create_app
from models.database import db
from models.company import Company
from models.user import User
from models.credit_score import CreditScore
from models.loan_application import LoanApplication
from models.project import Project
from models.dispute_case import DisputeCase
import os

def check_database():
    app = create_app()
    
    with app.app_context():
        print("\n" + "=" * 60)
        print("📊 DecoFinance 数据库检查工具")
        print("=" * 60)
        
        # 1. 显示数据库连接信息
        db_uri = app.config['SQLALCHEMY_DATABASE_URI']
        print(f"\n📍 数据库连接：{db_uri}")
        
        # 解析实际文件路径
        if db_uri.startswith('sqlite:///'):
            db_path = db_uri.replace('sqlite:///', '')
            if not os.path.isabs(db_path):
                # 相对路径
                instance_path = os.path.join(app.instance_path, db_path)
                models_path = os.path.join('models', db_path)
                print(f"📁 可能位置 1: {instance_path}")
                print(f"📁 可能位置 2: {models_path}")
        
        # 2. 检查数据库文件是否存在
        db_file = db.engine.url.database
        if db_file and db_file != ':memory:':
            exists = os.path.exists(db_file)
            status = "✅ 存在" if exists else "❌ 不存在"
            print(f"\n💾 数据库文件：{db_file}")
            print(f"   状态：{status}")
            if exists:
                size = os.path.getsize(db_file)
                print(f"   大小：{size:,} 字节 ({size/1024:.2f} KB)")
        
        # 3. 检查所有表
        from sqlalchemy import inspect, text
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        
        print(f"\n📋 数据库表列表 (共 {len(tables)} 个):")
        for table in sorted(tables):
            columns = inspector.get_columns(table)
            print(f"   - {table} ({len(columns)} 列)")
        
        # 4. 统计各表数据量
        print("\n📈 数据统计:")
        
        models_to_check = [
            (User, '👤 用户'),
            (Company, '🏢 公司'),
            (CreditScore, '📊 信用评分'),
            (LoanApplication, '💰 贷款申请'),
            (Project, '📁 项目'),
            (DisputeCase, '⚖️ 纠纷案例'),
        ]
        
        for model, label in models_to_check:
            try:
                count = model.query.count()
                status = "✅" if count > 0 else "⚠️"
                print(f"   {status} {label}: {count} 条")
            except Exception as e:
                print(f"   ❌ {label}: 查询失败 - {str(e)}")
        
        # 5. 显示最新记录
        print("\n📝 最新记录预览:")
        
        # 最新公司
        latest_company = Company.query.order_by(Company.id.desc()).first()
        if latest_company:
            print(f"   🏢 最新公司：{latest_company.company_name} (ID: {latest_company.id})")
        
        # 最新用户
        latest_user = User.query.order_by(User.id.desc()).first()
        if latest_user:
            print(f"   👤 最新用户：{latest_user.username} (角色：{latest_user.role})")
        
        # 最新信用评分
        latest_score = CreditScore.query.order_by(CreditScore.id.desc()).first()
        if latest_score:
            print(f"   📊 最新评分：{latest_score.credit_score} 分 (等级：{latest_score.credit_grade})")
        
        # 6. 数据完整性检查
        print("\n🔍 数据完整性检查:")
        
        # 检查没有信用评分的公司
        companies_without_scores = Company.query.outerjoin(
            CreditScore, Company.id == CreditScore.company_id
        ).filter(CreditScore.id == None).count()
        
        if companies_without_scores > 0:
            print(f"   ⚠️  {companies_without_scores} 个公司没有信用评分")
        else:
            print(f"   ✅ 所有公司都有信用评分")
        
        # 检查贷款申请
        pending_loans = LoanApplication.query.filter_by(
            application_status='pending'
        ).count()
        if pending_loans > 0:
            print(f"   ⏳ {pending_loans} 个待处理的贷款申请")
        
        # 检查纠纷
        open_disputes = DisputeCase.query.filter_by(status='open').count()
        if open_disputes > 0:
            print(f"   ⚠️  {open_disputes} 个未解决的纠纷")
        
        print("\n" + "=" * 60)
        print("✅ 数据库检查完成")
        print("=" * 60 + "\n")

if __name__ == '__main__':
    try:
        check_database()
    except Exception as e:
        print(f"\n❌ 检查失败：{str(e)}")
        print("\n可能的原因:")
        print("  1. 数据库未初始化 - 运行：python -c \"from app import create_app; from models.database import db; app=create_app(); app.app_context().push(); db.create_all()\"")
        print("  2. 依赖未安装 - 运行：pip install -r requirements.txt")
        print("  3. 虚拟环境未激活 - 运行：.venv\\Scripts\\activate")
