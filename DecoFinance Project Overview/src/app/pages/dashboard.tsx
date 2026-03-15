import { Link, useNavigate } from 'react-router';
import { useAuth } from '../contexts/auth-context';
import { useData } from '../contexts/data-context';
import { Sidebar } from '../components/sidebar';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  Award, DollarSign, FolderKanban, FileText, TrendingUp, AlertTriangle,
  Bell, Clock, CheckCircle, Users, BarChart3, Building2, Plus,
  Search, ClipboardList, ArrowRight, Activity
} from 'lucide-react';
import { motion } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// ─── Company Dashboard ─────────────────────────────────────────────────────────

function CompanyDashboard() {
  const { user } = useAuth();
  const { projects, loans, contracts, disputes } = useData();

  const myProjects = projects.filter(p => p.contractorId === user?.companyId);
  const myLoans = loans.filter(l => l.companyId === user?.companyId);
  const activeContracts = contracts.filter(c => c.contractorId === user?.companyId && c.state === 'active');
  const pendingBids = projects.filter(p => p.bids.some(b => b.companyId === user?.companyId && b.status === 'pending'));

  const scoreHistory = [
    { date: 'Sep', score: 3200 }, { date: 'Oct', score: 3280 }, { date: 'Nov', score: 3320 },
    { date: 'Dec', score: 3380 }, { date: 'Jan', score: 3420 }, { date: 'Feb', score: 3450 }, { date: 'Mar', score: 3468 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name}!</h1>
        <p className="text-gray-500 mt-1">Here's your business overview for today</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/credit-score">
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
            <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0 cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-100 text-xs font-medium">Trust Score</span>
                  <Award className="w-4 h-4 text-blue-200" />
                </div>
                <div className="text-3xl font-bold text-white">{user?.creditScore}</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-green-300" />
                  <span className="text-xs text-blue-200">+18 this month · Grade {user?.trustGrade}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </Link>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-xs font-medium">Active Projects</span>
              <FolderKanban className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{myProjects.length}</div>
            <div className="text-xs text-gray-500 mt-1">{pendingBids.length} pending bids</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-xs font-medium">Total Loans</span>
              <DollarSign className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              ${(myLoans.filter(l => l.status === 'approved' || l.status === 'disbursed').reduce((s, l) => s + l.amount, 0) / 1000).toFixed(0)}K
            </div>
            <div className="text-xs text-gray-500 mt-1">{myLoans.filter(l => l.status === 'pending' || l.status === 'under_review').length} under review</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-xs font-medium">Contracts</span>
              <FileText className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{activeContracts.length}</div>
            <div className="text-xs text-gray-500 mt-1">
              ${(activeContracts.reduce((s, c) => s + c.releasedAmount, 0) / 1000).toFixed(0)}K released
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trust Score Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Trust Score History</CardTitle>
            <CardDescription>Last 7 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreHistory}>
                  <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis domain={[3100, 3500]} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2.5} dot={{ fill: '#2563eb', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/projects">
              <Button variant="outline" className="w-full justify-start gap-2 text-sm">
                <Search className="w-4 h-4 text-blue-500" />
                Browse Projects
              </Button>
            </Link>
            <Link to="/loan-application">
              <Button variant="outline" className="w-full justify-start gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-green-500" />
                Apply for Loan
              </Button>
            </Link>
            <Link to="/credit-score">
              <Button variant="outline" className="w-full justify-start gap-2 text-sm">
                <Award className="w-4 h-4 text-yellow-500" />
                View Credit Report
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="outline" className="w-full justify-start gap-2 text-sm">
                <Building2 className="w-4 h-4 text-purple-500" />
                Update Profile
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Active Projects */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">My Active Projects</CardTitle>
            <Link to="/projects"><Button variant="ghost" size="sm" className="gap-1 text-xs">View all <ArrowRight className="w-3 h-3" /></Button></Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {myProjects.slice(0, 3).map(project => (
              <div key={project.id} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">{project.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{project.milestones.filter(m => m.status === 'approved').length}/{project.milestones.length} milestones complete</div>
                </div>
                <div className="w-24 hidden sm:block">
                  <Progress value={project.milestones.length > 0 ? (project.milestones.filter(m => m.status === 'approved').length / project.milestones.length) * 100 : 0} className="h-1.5" />
                </div>
                <Badge className={project.status === 'active' ? 'bg-blue-100 text-blue-700' : project.status === 'disputed' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                  {project.status}
                </Badge>
              </div>
            ))}
            {myProjects.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                No active projects. <Link to="/projects" className="text-blue-600">Browse the marketplace</Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Customer Dashboard ────────────────────────────────────────────────────────

function CustomerDashboard() {
  const { user } = useAuth();
  const { projects, disputes, loans } = useData();

  const myProjects = projects.filter(p => p.customerId === user?.id);
  const openProjects = myProjects.filter(p => p.status === 'open' || p.status === 'bidding');
  const activeProjects = myProjects.filter(p => p.status === 'active');
  const myDisputes = disputes.filter(d => d.raisedBy === user?.name);
  const pendingMilestones = myProjects.flatMap(p => p.milestones).filter(m => m.status === 'submitted');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name}!</h1>
        <p className="text-gray-500 mt-1">Manage your renovation projects</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'My Projects', value: myProjects.length, icon: FolderKanban, color: 'text-blue-500', sub: `${activeProjects.length} active` },
          { label: 'Pending Bids', value: openProjects.reduce((s, p) => s + p.bids.length, 0), icon: ClipboardList, color: 'text-green-500', sub: `${openProjects.length} projects bidding` },
          { label: 'Milestone Reviews', value: pendingMilestones.length, icon: CheckCircle, color: 'text-yellow-500', sub: 'Need approval' },
          { label: 'Open Disputes', value: myDisputes.filter(d => d.status === 'open' || d.status === 'under_review').length, icon: AlertTriangle, color: 'text-red-500', sub: 'Under review' },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 text-xs font-medium">{label}</span>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="text-3xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500 mt-1">{sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">My Projects</CardTitle>
              <Link to="/projects"><Button variant="ghost" size="sm" className="gap-1 text-xs">View all <ArrowRight className="w-3 h-3" /></Button></Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {myProjects.slice(0, 4).map(p => (
              <Link key={p.id} to={`/projects/${p.id}`} className="block">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <FolderKanban className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{p.title}</div>
                    <div className="text-xs text-gray-500">{p.bids.length} bids · Budget: ${p.budget.toLocaleString()}</div>
                  </div>
                  <Badge className={
                    p.status === 'open' ? 'bg-gray-100 text-gray-700' :
                    p.status === 'bidding' ? 'bg-yellow-100 text-yellow-700' :
                    p.status === 'active' ? 'bg-blue-100 text-blue-700' :
                    p.status === 'disputed' ? 'bg-red-100 text-red-700' :
                    'bg-green-100 text-green-700'
                  }>
                    {p.status}
                  </Badge>
                </div>
              </Link>
            ))}
            <Link to="/projects">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 mt-2">
                <Plus className="w-4 h-4 mr-2" /> New Project
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Milestones Awaiting Approval</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingMilestones.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">No milestones pending approval</div>
            ) : pendingMilestones.map(m => (
              <div key={m.id} className="p-3 border border-yellow-200 bg-yellow-50 rounded-lg">
                <div className="font-medium text-sm text-gray-900">{m.title}</div>
                <div className="text-xs text-gray-600 mt-0.5">Amount: ${m.amount.toLocaleString()} · Submitted {m.submittedAt?.split('T')[0]}</div>
                <div className="flex gap-2 mt-2">
                  <Link to={`/projects/${m.projectId}`} className="flex-1">
                    <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-xs">Review & Approve</Button>
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Reviewer Dashboard ────────────────────────────────────────────────────────

function ReviewerDashboard() {
  const { user } = useAuth();
  const { loans, disputes, companies, projects } = useData();

  const pendingLoans = loans.filter(l => l.status === 'pending' || l.status === 'under_review');
  const openDisputes = disputes.filter(d => d.status === 'open' || d.status === 'under_review');
  const loanStatusData = [
    { name: 'Pending', value: loans.filter(l => l.status === 'pending').length },
    { name: 'Under Review', value: loans.filter(l => l.status === 'under_review').length },
    { name: 'Approved', value: loans.filter(l => l.status === 'approved' || l.status === 'disbursed').length },
    { name: 'Rejected', value: loans.filter(l => l.status === 'rejected').length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reviewer Dashboard</h1>
        <p className="text-gray-500 mt-1">Review loan applications and dispute cases</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pending Loans', value: pendingLoans.length, icon: ClipboardList, color: 'text-orange-500', urgent: true },
          { label: 'Open Disputes', value: openDisputes.length, icon: AlertTriangle, color: 'text-red-500', urgent: openDisputes.length > 0 },
          { label: 'Companies', value: companies.length, icon: Building2, color: 'text-blue-500', urgent: false },
          { label: 'Active Projects', value: projects.filter(p => p.status === 'active').length, icon: FolderKanban, color: 'text-green-500', urgent: false },
        ].map(({ label, value, icon: Icon, color, urgent }) => (
          <Card key={label} className={urgent && value > 0 ? 'border-orange-200' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 text-xs font-medium">{label}</span>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="text-3xl font-bold text-gray-900">{value}</div>
              {urgent && value > 0 && <div className="text-xs text-orange-500 mt-1 font-medium">Action required</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Loan Queue</CardTitle>
              <Link to="/approvals"><Button variant="ghost" size="sm">View all <ArrowRight className="w-3 h-3 ml-1" /></Button></Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingLoans.slice(0, 4).map(loan => (
              <div key={loan.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-4 h-4 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{loan.applicantName}</div>
                  <div className="text-xs text-gray-500">${loan.amount.toLocaleString()} · {loan.term}mo · {loan.createdAt.split('T')[0]}</div>
                </div>
                <Badge className={loan.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}>
                  {loan.status === 'under_review' ? 'In Review' : 'Pending'}
                </Badge>
              </div>
            ))}
            {pendingLoans.length === 0 && <div className="text-center py-6 text-gray-500 text-sm">No pending loans</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Active Disputes</CardTitle>
              <Link to="/disputes"><Button variant="ghost" size="sm">View all <ArrowRight className="w-3 h-3 ml-1" /></Button></Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {openDisputes.slice(0, 4).map(d => (
              <div key={d.id} className="flex items-center gap-3 p-3 border border-red-100 bg-red-50 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{d.projectTitle}</div>
                  <div className="text-xs text-gray-600">Raised by {d.raisedBy} · {d.createdAt.split('T')[0]}</div>
                </div>
                <Badge className="bg-red-100 text-red-700">{d.status === 'under_review' ? 'In Review' : 'Open'}</Badge>
              </div>
            ))}
            {openDisputes.length === 0 && <div className="text-center py-6 text-gray-500 text-sm">No open disputes</div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Loan Portfolio Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={loanStatusData}>
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Admin Dashboard ────────────────────────────────────────────────────────────

function AdminDashboard() {
  const { projects, loans, disputes, companies, contracts, auditLogs } = useData();

  const totalLoanValue = loans.filter(l => l.status === 'approved' || l.status === 'disbursed').reduce((s, l) => s + l.amount, 0);
  const activeProjects = projects.filter(p => p.status === 'active').length;

  const monthlyData = [
    { month: 'Oct', loans: 12, projects: 8, disputes: 2 },
    { month: 'Nov', loans: 15, projects: 11, disputes: 3 },
    { month: 'Dec', loans: 18, projects: 14, disputes: 1 },
    { month: 'Jan', loans: 22, projects: 18, disputes: 4 },
    { month: 'Feb', loans: 25, projects: 20, disputes: 2 },
    { month: 'Mar', loans: 28, projects: 22, disputes: 3 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Administration</h1>
        <p className="text-gray-500 mt-1">System-wide metrics and control panel</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Companies', value: companies.length, icon: Building2, color: 'text-blue-500', sub: `${companies.filter(c => c.licenceStatus === 'valid').length} licensed` },
          { label: 'Active Projects', value: activeProjects, icon: FolderKanban, color: 'text-green-500', sub: `${projects.length} total` },
          { label: 'Loan Portfolio', value: `$${(totalLoanValue / 1000).toFixed(0)}K`, icon: DollarSign, color: 'text-yellow-500', sub: `${loans.length} applications` },
          { label: 'Open Disputes', value: disputes.filter(d => d.status !== 'resolved' && d.status !== 'closed').length, icon: AlertTriangle, color: 'text-red-500', sub: `${disputes.length} total` },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 text-xs font-medium">{label}</span>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="text-3xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500 mt-1">{sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Platform Activity (6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Bar key="bar-loans" dataKey="loans" name="Loans" fill="#2563eb" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar key="bar-projects" dataKey="projects" name="Projects" fill="#16a34a" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar key="bar-disputes" dataKey="disputes" name="Disputes" fill="#dc2626" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Audit Logs</CardTitle>
              <Link to="/audit-logs"><Button variant="ghost" size="sm">View all <ArrowRight className="w-3 h-3 ml-1" /></Button></Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {auditLogs.slice(0, 5).map(log => (
              <div key={log.id} className="flex items-start gap-2 p-2 rounded hover:bg-gray-50">
                <Activity className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-gray-700">{log.details}</span>
                  <div className="text-xs text-gray-400">{log.actorName} · {log.createdAt.split('T')[0]}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Contract States</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { state: 'Active', count: contracts.filter(c => c.state === 'active').length, color: 'bg-green-500' },
                { state: 'Frozen', count: contracts.filter(c => c.state === 'frozen').length, color: 'bg-red-500' },
                { state: 'Pending Review', count: contracts.filter(c => c.state === 'pending_review').length, color: 'bg-yellow-500' },
                { state: 'Completed', count: contracts.filter(c => c.state === 'completed').length, color: 'bg-blue-500' },
              ].map(({ state, count, color }) => (
                <div key={state} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="text-sm text-gray-700 flex-1">{state}</span>
                  <span className="font-semibold text-sm">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top Trust Grades</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {companies.map(c => (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-sm font-bold text-blue-700">
                    {c.trustGrade}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{c.name}</div>
                    <div className="text-xs text-gray-500">{c.creditScore}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">System Stats (JSON)</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-50 rounded-lg p-3 overflow-auto max-h-40 text-gray-600">
{JSON.stringify({
  companies: companies.length,
  projects: { total: projects.length, active: activeProjects },
  loans: { total: loans.length, value: totalLoanValue },
  disputes: { open: disputes.filter(d => d.status === 'open').length, total: disputes.length },
  contracts: contracts.length,
  auditLogs: auditLogs.length,
}, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate('/login');
    return null;
  }

  const renderDashboard = () => {
    switch (user.role) {
      case 'company_user': return <CompanyDashboard />;
      case 'customer': return <CustomerDashboard />;
      case 'reviewer': return <ReviewerDashboard />;
      case 'admin': return <AdminDashboard />;
      default: return <CompanyDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8">
        {renderDashboard()}
      </main>
    </div>
  );
}