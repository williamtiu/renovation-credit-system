"""
数据库初始化脚本 - 添加公司验证和贷款转介相关表
"""

from models.database import db
from models.company_verification import CompanyVerification, LoanReferral, Bank
from models.company import Company
from models.loan_application import LoanApplication
from models.user import User

def init_verification_tables():
    """初始化验证相关表"""
    with db.app.app_context():
        # 创建表
        db.create_all()
        
        print("✓ Tables created successfully!")
        
        # 检查表是否存在
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        
        print("\nExisting tables:")
        for table in tables:
            print(f"  - {table}")
        
        # 检查特定表
        required_tables = ['company_verifications', 'loan_referrals', 'banks']
        print("\nRequired tables status:")
        for table in required_tables:
            if table in tables:
                print(f"  ✓ {table}")
            else:
                print(f"  ✗ {table} (missing)")
        
        # 显示列信息
        print("\nCompany Verifications columns:")
        if 'company_verifications' in tables:
            columns = inspector.get_columns('company_verifications')
            for col in columns:
                print(f"  - {col['name']} ({col['type']})")
        
        print("\nLoan Referrals columns:")
        if 'loan_referrals' in tables:
            columns = inspector.get_columns('loan_referrals')
            for col in columns:
                print(f"  - {col['name']} ({col['type']})")
        
        print("\nBanks columns:")
        if 'banks' in tables:
            columns = inspector.get_columns('banks')
            for col in columns:
                print(f"  - {col['name']} ({col['type']})")

if __name__ == '__main__':
    init_verification_tables()
