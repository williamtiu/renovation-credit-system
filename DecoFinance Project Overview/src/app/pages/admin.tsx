import { Link } from 'react-router';
import { useData } from '../contexts/data-context';
import { Sidebar } from '../components/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import {
  BarChart3, Building2, FolderKanban, DollarSign, AlertTriangle,
  Shield, Users, TrendingUp, Activity, ArrowRight, Award, CheckCircle
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#f59e0b'];

export default function Admin() {
  const { companies, projects, loans, disputes, contracts, auditLogs } = useData();

  const totalLoanValue = loans.reduce((s, l) => s + l.amount, 0);
  const approvedLoanValue = loans.filter(l => l.status === 'approved' || l.status === 'disbursed').reduce((s, l) => s + l.amount, 0);

  const monthlyData = [
    { month: 'Oct', loans: 12, projects: 8, disputes: 2, companies: 45 },
    { month: 'Nov', loans: 15, projects: 11, disputes: 3, companies: 52 },
    { month: 'Dec', loans: 18, projects: 14, disputes: 1, companies: 60 },
    { month: 'Jan', loans: 22, projects: 18, disputes: 4, companies: 71 },
    { month: 'Feb', loans: 25, projects: 20, disputes: 2, companies: 85 },
    { month: 'Mar', loans: 28, projects: 22, disputes: 3, companies: 98 },
  ];

  const loanDistribution = [
    { name: 'Pending', value: loans.filter(l => l.status === 'pending').length },
    { name: 'Under Review', value: loans.filter(l => l.status === 'under_review').length },
    { name: 'Approved', value: loans.filter(l => l.status === 'approved').length },
    { name: 'Disbursed', value: loans.filter(l => l.status === 'disbursed').length },
    { name: 'Rejected', value: loans.filter(l => l.status === 'rejected').length },
  ];

  const projectDistribution = [
    { name: 'Open', value: projects.filter(p => p.status === 'open').length },
    { name: 'Bidding', value: projects.filter(p => p.status === 'bidding').length },
    { name: 'Active', value: projects.filter(p => p.status === 'active').length },
    { name: 'Disputed', value: projects.filter(p => p.status === 'disputed').length },
    { name: 'Completed', value: projects.filter(p => p.status === 'completed').length },
  ];

  const topCompanies = [...companies].sort((a, b) => b.creditScore - a.creditScore);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Platform Metrics</h1>
            <p className="text-gray-500 mt-1">Comprehensive system-wide analytics and control</p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Total Companies',
                value: companies.length,
                sub: `${companies.filter(c => c.licenceStatus === 'valid').length} licensed`,
                icon: Building2, color: 'text-blue-500', bg: 'bg-blue-50',
              },
              {
                label: 'Active Projects',
                value: projects.filter(p => p.status === 'active').length,
                sub: `${projects.length} total`,
                icon: FolderKanban, color: 'text-green-500', bg: 'bg-green-50',
              },
              {
                label: 'Loan Portfolio',
                value: `$${(approvedLoanValue / 1000).toFixed(0)}K`,
                sub: `${loans.length} applications`,
                icon: DollarSign, color: 'text-yellow-600', bg: 'bg-yellow-50',
              },
              {
                label: 'Open Disputes',
                value: disputes.filter(d => d.status !== 'resolved' && d.status !== 'closed').length,
                sub: `${disputes.length} total`,
                icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50',
              },
            ].map(({ label, value, sub, icon: Icon, color, bg }) => (
              <Card key={label}>
                <CardContent className="p-5">
                  <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{value}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{label}</div>
                  <div className="text-xs text-gray-400 mt-1">{sub}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Platform Growth (6 months)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="colorLoans" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#16a34a" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                      <Area type="monotone" dataKey="loans" name="Loans" stroke="#2563eb" fill="url(#colorLoans)" strokeWidth={2} />
                      <Area type="monotone" dataKey="projects" name="Projects" stroke="#16a34a" fill="url(#colorProjects)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Loan Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-52 flex items-center gap-4">
                  <ResponsiveContainer width="50%" height="100%">
                    <PieChart>
                      <Pie data={loanDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                        {loanDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {loanDistribution.map((entry, idx) => (
                      <div key={entry.name} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="text-gray-600 flex-1">{entry.name}</span>
                        <span className="font-semibold text-gray-900">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contract States & Top Companies */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Smart Contract States</CardTitle>
                  <Link to="/contracts"><Button variant="ghost" size="sm">View all</Button></Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { state: 'Active', count: contracts.filter(c => c.state === 'active').length, color: 'bg-green-500', max: contracts.length },
                    { state: 'Frozen', count: contracts.filter(c => c.state === 'frozen').length, color: 'bg-red-500', max: contracts.length },
                    { state: 'Pending Review', count: contracts.filter(c => c.state === 'pending_review').length, color: 'bg-yellow-500', max: contracts.length },
                    { state: 'Completed', count: contracts.filter(c => c.state === 'completed').length, color: 'bg-blue-500', max: contracts.length },
                  ].map(({ state, count, color, max }) => (
                    <div key={state} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">{state}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${color}`} style={{ width: max > 0 ? `${(count / max) * 100}%` : '0%' }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs font-medium text-gray-600 mb-2">Total Escrow Value</div>
                  <div className="text-xl font-bold text-gray-900">
                    ${contracts.reduce((s, c) => s + c.lockedAmount, 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">in active escrow</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Top Trusted Companies</CardTitle>
                  <Link to="/profile"><Button variant="ghost" size="sm">View all</Button></Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topCompanies.map((company, idx) => (
                    <div key={company.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                      <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                        #{idx + 1}
                      </div>
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-blue-700 text-sm">{company.trustGrade}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">{company.name}</div>
                        <div className="text-xs text-gray-500">{company.employees} employees · {company.esgRating} ESG</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-gray-900">{company.creditScore}</div>
                        <div className="text-xs text-gray-500">{company.trustLevel}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { to: '/audit-logs', label: 'Audit Logs', desc: `${auditLogs.length} events`, icon: Activity, color: 'bg-blue-100 text-blue-600' },
              { to: '/approvals', label: 'Loan Management', desc: `${loans.filter(l => l.status === 'pending').length} pending`, icon: DollarSign, color: 'bg-green-100 text-green-600' },
              { to: '/disputes', label: 'Dispute Center', desc: `${disputes.filter(d => d.status !== 'resolved').length} open`, icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
              { to: '/contracts', label: 'Contracts', desc: `${contracts.length} total`, icon: Shield, color: 'bg-purple-100 text-purple-600' },
            ].map(({ to, label, desc, icon: Icon, color }) => (
              <Link key={to} to={to}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="font-medium text-sm text-gray-900">{label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* System API Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">System Statistics (JSON API)</CardTitle>
              <CardDescription>Machine-readable statistics for automation and testing</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-900 text-green-400 rounded-xl p-5 overflow-auto max-h-64">
{JSON.stringify({
  timestamp: new Date().toISOString(),
  platform: 'DecoFinance v1.0',
  statistics: {
    companies: {
      total: companies.length,
      licensed: companies.filter(c => c.licenceStatus === 'valid').length,
      avgCreditScore: Math.round(companies.reduce((s, c) => s + c.creditScore, 0) / companies.length),
    },
    projects: {
      total: projects.length,
      byStatus: {
        open: projects.filter(p => p.status === 'open').length,
        bidding: projects.filter(p => p.status === 'bidding').length,
        active: projects.filter(p => p.status === 'active').length,
        disputed: projects.filter(p => p.status === 'disputed').length,
        completed: projects.filter(p => p.status === 'completed').length,
      },
      totalBudget: projects.reduce((s, p) => s + p.budget, 0),
    },
    loans: {
      total: loans.length,
      totalValue: totalLoanValue,
      approvedValue: approvedLoanValue,
      byStatus: {
        pending: loans.filter(l => l.status === 'pending').length,
        under_review: loans.filter(l => l.status === 'under_review').length,
        approved: loans.filter(l => l.status === 'approved').length,
        disbursed: loans.filter(l => l.status === 'disbursed').length,
        rejected: loans.filter(l => l.status === 'rejected').length,
      },
    },
    disputes: {
      total: disputes.length,
      open: disputes.filter(d => d.status === 'open').length,
      under_review: disputes.filter(d => d.status === 'under_review').length,
      resolved: disputes.filter(d => d.status === 'resolved').length,
    },
    contracts: {
      total: contracts.length,
      active: contracts.filter(c => c.state === 'active').length,
      frozen: contracts.filter(c => c.state === 'frozen').length,
      totalEscrowValue: contracts.reduce((s, c) => s + c.lockedAmount, 0),
      totalReleasedValue: contracts.reduce((s, c) => s + c.releasedAmount, 0),
    },
    auditLogs: {
      total: auditLogs.length,
    },
  },
}, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
