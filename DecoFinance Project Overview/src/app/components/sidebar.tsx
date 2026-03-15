import { Link, useLocation, useNavigate } from 'react-router';
import type { ComponentType } from 'react';
import { useAuth } from '../contexts/auth-context';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  LayoutDashboard,
  Building2,
  DollarSign,
  FolderKanban,
  FileText,
  LogOut,
  Shield,
  BarChart3,
  AlertTriangle,
  ClipboardList,
  Award,
  Search,
  Code2,
  FileBarChart,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  badge?: string;
}

function getNavItems(role: string | null): NavItem[] {
  switch (role) {
    case 'company_user':
      return [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/profile', label: 'Company Profile', icon: Building2 },
        { to: '/credit-score', label: 'Trust Score', icon: Award },
        { to: '/projects', label: 'Project Marketplace', icon: Search },
        { to: '/contracts', label: 'Contracts', icon: FileText },
        { to: '/loan-application', label: 'Loan Applications', icon: DollarSign },
        { to: '/developer', label: 'Developer', icon: Code2 },
      ];
    case 'customer':
      return [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/projects', label: 'My Projects', icon: FolderKanban },
        { to: '/companies', label: 'Find Companies', icon: Search },
        { to: '/contracts', label: 'Contracts', icon: FileText },
        { to: '/disputes', label: 'Disputes', icon: AlertTriangle },
        { to: '/developer', label: 'Developer', icon: Code2 },
      ];
    case 'reviewer':
      return [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/approvals', label: 'Loan Approvals', icon: ClipboardList },
        { to: '/disputes', label: 'Disputes', icon: AlertTriangle },
        { to: '/projects', label: 'All Projects', icon: FolderKanban },
        { to: '/profile', label: 'Company Reports', icon: FileBarChart },
        { to: '/audit-logs', label: 'Audit Logs', icon: BarChart3 },
        { to: '/developer', label: 'Developer', icon: Code2 },
      ];
    case 'admin':
      return [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/admin', label: 'Platform Metrics', icon: BarChart3 },
        { to: '/projects', label: 'All Projects', icon: FolderKanban },
        { to: '/approvals', label: 'Loan Management', icon: DollarSign },
        { to: '/disputes', label: 'Disputes', icon: AlertTriangle },
        { to: '/contracts', label: 'Contracts', icon: FileText },
        { to: '/audit-logs', label: 'Audit Logs', icon: ClipboardList },
        { to: '/profile', label: 'Companies', icon: Building2 },
        { to: '/developer', label: 'Developer', icon: Code2 },
      ];
    default:
      return [];
  }
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = getNavItems(user?.role || null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const roleLabels: Record<string, string> = {
    company_user: 'Company',
    customer: 'Customer',
    reviewer: 'Reviewer',
    admin: 'Administrator',
  };

  const roleColors: Record<string, string> = {
    company_user: 'bg-blue-100 text-blue-700',
    customer: 'bg-green-100 text-green-700',
    reviewer: 'bg-purple-100 text-purple-700',
    admin: 'bg-red-100 text-red-700',
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-bold text-lg text-gray-900 leading-tight">DecoFinance</div>
          <div className="text-xs text-gray-500 truncate max-w-[130px]">{user?.name}</div>
        </div>
      </div>

      {/* Role Badge */}
      <div className="mb-6">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${roleColors[user?.role || ''] || 'bg-gray-100 text-gray-700'}`}>
          {roleLabels[user?.role || ''] || 'User'}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`} />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <Badge className="ml-auto bg-red-500 text-white text-xs">{item.badge}</Badge>
              )}
              {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Trust Score Card (company only) */}
      {user?.role === 'company_user' && user.creditScore && (
        <Link to="/credit-score" className="block mb-4">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 text-white">
            <div className="text-xs text-blue-200 mb-1">Trust Score</div>
            <div className="text-2xl font-bold">{user.creditScore}</div>
            <div className="text-sm text-blue-200">Grade {user.trustGrade} · {user.trustLevel}</div>
          </div>
        </Link>
      )}

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full justify-start gap-2 mt-2"
        onClick={handleLogout}
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </Button>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden bg-white border border-gray-200 rounded-lg p-2 shadow-sm"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Mobile */}
      <aside className={`fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 p-6 z-40 transition-transform duration-300 lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:block fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 p-6 z-30 overflow-y-auto">
        <SidebarContent />
      </aside>
    </>
  );
}