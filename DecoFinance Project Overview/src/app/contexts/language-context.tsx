import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Header
    'nav.about': 'About Us',
    'nav.features': 'Features',
    'nav.contact': 'Contact Us',
    'nav.login': 'Login',
    'nav.signup': 'Sign Up',
    
    // Hero
    'hero.title': 'Building a Safe and Transparent Trust Ecosystem for the Renovation Industry',
    'hero.cta': 'Get Started',
    
    // Features
    'features.title': 'Platform Features',
    'feature.trust.title': 'Trust Scoring',
    'feature.trust.desc': 'Build credibility with our comprehensive trust and credit scoring system',
    'feature.loan.title': 'Loan Application',
    'feature.loan.desc': 'Apply for renovation financing with competitive rates based on your trust score',
    'feature.contract.title': 'Contract Tracking',
    'feature.contract.desc': 'Track project milestones and manage contracts transparently',
    'feature.dispute.title': 'Dispute Resolution',
    'feature.dispute.desc': 'Fair and transparent dispute resolution process for all parties',
    'feature.review.title': 'Professional Review',
    'feature.review.desc': 'Expert reviewers ensure quality and compliance at every milestone',
    'feature.analytics.title': 'Analytics & Reports',
    'feature.analytics.desc': 'Comprehensive analytics and reporting for better decision making',
    'features.learnmore': 'Learn More',
    
    // Footer
    'footer.contact': 'Contact Information',
    'footer.email': 'Email',
    'footer.phone': 'Phone',
    'footer.privacy': 'Privacy Policy',
    'footer.terms': 'Terms of Service',
    'footer.social': 'Follow Us',
    'footer.copyright': '© 2026 DecoFinance. All rights reserved.',
    
    // Login
    'login.title': 'Welcome Back',
    'login.subtitle': 'Login to access your account',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.remember': 'Remember me',
    'login.forgot': 'Forgot Password?',
    'login.submit': 'Login',
    'login.google': 'Login with Google',
    'login.company': 'Login with Company Account',
    'login.noaccount': "Don't have an account?",
    'login.signuplink': 'Sign up',
    'login.security': 'Your data is protected with us',
    
    // Register
    'register.title': 'Create Account',
    'register.subtitle': 'Join DecoFinance today',
    'register.name': 'Full Name',
    'register.email': 'Email',
    'register.password': 'Password',
    'register.confirm': 'Confirm Password',
    'register.role': 'Account Type',
    'register.role.company': 'Renovation Company',
    'register.role.client': 'Client',
    'register.submit': 'Sign Up',
    'register.hasaccount': 'Already have an account?',
    'register.loginlink': 'Login',
    
    // Dashboard
    'dashboard.welcome': 'Welcome',
    'dashboard.profile': 'Company Profile',
    'dashboard.loans': 'Loan Applications',
    'dashboard.projects': 'Projects',
    'dashboard.contracts': 'Contracts',
    'dashboard.logout': 'Logout',
    'dashboard.creditscore': 'Credit Score',
    'dashboard.trustlevel': 'Trust Level',
    'dashboard.loanstatus': 'Loan Status',
    'dashboard.activeprojects': 'Active Projects',
    'dashboard.applyloan': 'Apply for Loan',
    'dashboard.newproject': 'Add New Project',
    'dashboard.notifications': 'Notifications',
    'dashboard.approved': 'Approved',
    'dashboard.pending': 'Pending',
    'dashboard.progress': 'In Progress',
    
    // Loan Application
    'loan.title': 'Loan Application',
    'loan.amount': 'Loan Amount',
    'loan.duration': 'Repayment Duration',
    'loan.months': 'months',
    'loan.interest': 'Interest Rate',
    'loan.total': 'Total Repayment',
    'loan.probability': 'Approval Probability',
    'loan.submit': 'Submit Application',
    'loan.trustbased': 'Based on your trust score',
    
    // Projects
    'projects.title': 'Project Management',
    'projects.new': 'New Project',
    'projects.name': 'Project Name',
    'projects.startdate': 'Start Date',
    'projects.status': 'Status',
    'projects.milestone': 'Current Milestone',
    'projects.viewdetails': 'View Details',
    'projects.upload': 'Upload Deliverable',
    'projects.dispute': 'Raise Dispute',
    
    // Admin
    'admin.title': 'Admin Dashboard',
    'admin.users': 'User Management',
    'admin.statistics': 'System Statistics',
    'admin.logs': 'System Logs',
    'admin.editrole': 'Edit Role',
    'admin.disable': 'Disable Account',
    'admin.loansapproved': 'Loans Approved',
    'admin.avgcredit': 'Average Credit Score',
    'admin.disputes': 'Active Disputes',
  },
  zh: {
    // Header
    'nav.about': '关于我们',
    'nav.features': '功能特点',
    'nav.contact': '联系我们',
    'nav.login': '登录',
    'nav.signup': '注册',
    
    // Hero
    'hero.title': '为装修行业打造安全透明的信任与融资生态系统',
    'hero.cta': '立即开始',
    
    // Features
    'features.title': '平台功能',
    'feature.trust.title': '信用评分',
    'feature.trust.desc': '通过我们全面的信任和信用评分系统建立可信度',
    'feature.loan.title': '贷款申请',
    'feature.loan.desc': '根据您的信用评分申请具有竞争力的装修融资',
    'feature.contract.title': '合同追踪',
    'feature.contract.desc': '透明地跟踪项目里程碑和管理合同',
    'feature.dispute.title': '纠纷解决',
    'feature.dispute.desc': '为所有各方提供公平透明的纠纷解决流程',
    'feature.review.title': '专业审核',
    'feature.review.desc': '专家审核员确保每个里程碑的质量和合规性',
    'feature.analytics.title': '分析与报告',
    'feature.analytics.desc': '全面的分析和报告，助力更好的决策',
    'features.learnmore': '了解更多',
    
    // Footer
    'footer.contact': '联系信息',
    'footer.email': '邮箱',
    'footer.phone': '电话',
    'footer.privacy': '隐私政策',
    'footer.terms': '服务条款',
    'footer.social': '关注我们',
    'footer.copyright': '© 2026 DecoFinance 版权所有',
    
    // Login
    'login.title': '欢迎回来',
    'login.subtitle': '登录访问您的账户',
    'login.email': '邮箱',
    'login.password': '密码',
    'login.remember': '记住我',
    'login.forgot': '忘记密码？',
    'login.submit': '登录',
    'login.google': '使用Google登录',
    'login.company': '使用公司账户登录',
    'login.noaccount': '还没有账户？',
    'login.signuplink': '注册',
    'login.security': '您的数据受到我们的保护',
    
    // Register
    'register.title': '创建账户',
    'register.subtitle': '立即加入DecoFinance',
    'register.name': '全名',
    'register.email': '邮箱',
    'register.password': '密码',
    'register.confirm': '确认密码',
    'register.role': '账户类型',
    'register.role.company': '装修公司',
    'register.role.client': '客户',
    'register.submit': '注册',
    'register.hasaccount': '已有账户？',
    'register.loginlink': '登录',
    
    // Dashboard
    'dashboard.welcome': '欢迎',
    'dashboard.profile': '公司资料',
    'dashboard.loans': '贷款申请',
    'dashboard.projects': '项目',
    'dashboard.contracts': '合同',
    'dashboard.logout': '登出',
    'dashboard.creditscore': '信用评分',
    'dashboard.trustlevel': '信任等级',
    'dashboard.loanstatus': '贷款状态',
    'dashboard.activeprojects': '活跃项目',
    'dashboard.applyloan': '申请贷款',
    'dashboard.newproject': '新增项目',
    'dashboard.notifications': '通知',
    'dashboard.approved': '已批准',
    'dashboard.pending': '待处理',
    'dashboard.progress': '进行中',
    
    // Loan Application
    'loan.title': '贷款申请',
    'loan.amount': '贷款金额',
    'loan.duration': '还款期限',
    'loan.months': '月',
    'loan.interest': '利率',
    'loan.total': '总还款额',
    'loan.probability': '批准概率',
    'loan.submit': '提交申请',
    'loan.trustbased': '基于您的信用评分',
    
    // Projects
    'projects.title': '项目管理',
    'projects.new': '新项目',
    'projects.name': '项目名称',
    'projects.startdate': '开始日期',
    'projects.status': '状态',
    'projects.milestone': '当前里程碑',
    'projects.viewdetails': '查看详情',
    'projects.upload': '上传成果',
    'projects.dispute': '提出纠纷',
    
    // Admin
    'admin.title': '管理员仪表板',
    'admin.users': '用户管理',
    'admin.statistics': '系统统计',
    'admin.logs': '系统日志',
    'admin.editrole': '编辑角色',
    'admin.disable': '禁用账户',
    'admin.loansapproved': '已批准贷款',
    'admin.avgcredit': '平均信用评分',
    'admin.disputes': '活跃纠纷',
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
