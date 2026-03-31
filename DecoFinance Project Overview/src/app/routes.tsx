import { createBrowserRouter, Link } from 'react-router';
import Home from './pages/home';
import Login from './pages/login';
import Register from './pages/register';
import Dashboard from './pages/dashboard';
import LoanApplication from './pages/loan-application';
import Projects from './pages/projects';
import ProjectDetail from './pages/project-detail';
import Admin from './pages/admin';
import Profile from './pages/profile';
import Contracts from './pages/contracts';
import Approvals from './pages/approvals';
import CreditScore from './pages/credit-score';
import Disputes from './pages/disputes';
import AuditLogs from './pages/audit-logs';
import Companies from './pages/companies';
import CompanyDetail from './pages/company-detail';
import DeveloperPage from './pages/developer';

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-6xl font-bold text-gray-200 mb-4">404</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
        <p className="text-gray-500 mb-6">The page you're looking for doesn't exist.</p>
        <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">Go to Home →</Link>
      </div>
    </div>
  );
}

const routerBase = ((import.meta as any).env?.BASE_URL || '/').replace(/\/$/, '') || '/';

export const router = createBrowserRouter([
  { path: '/', Component: Home },
  { path: '/login', Component: Login },
  { path: '/register', Component: Register },
  { path: '/dashboard', Component: Dashboard },
  { path: '/credit-score', Component: CreditScore },
  { path: '/profile', Component: Profile },
  { path: '/loan-application', Component: LoanApplication },
  { path: '/projects', Component: Projects },
  { path: '/projects/:id', Component: ProjectDetail },
  { path: '/contracts', Component: Contracts },
  { path: '/approvals', Component: Approvals },
  { path: '/disputes', Component: Disputes },
  { path: '/audit-logs', Component: AuditLogs },
  { path: '/admin', Component: Admin },
  { path: '/companies', Component: Companies },
  { path: '/companies/:id', Component: CompanyDetail },
  { path: '/developer', Component: DeveloperPage },
  { path: '*', Component: NotFound },
], {
  basename: routerBase,
});
