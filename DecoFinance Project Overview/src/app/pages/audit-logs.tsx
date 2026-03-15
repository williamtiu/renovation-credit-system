import { useState } from 'react';
import type { ComponentType } from 'react';
import { useData } from '../contexts/data-context';
import { Sidebar } from '../components/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Activity, Search, User, Building2, Shield, DollarSign, FolderKanban, AlertTriangle, FileText } from 'lucide-react';

const ACTION_CONFIG: Record<string, { color: string; icon: ComponentType<{className?:string}> }> = {
  USER_LOGIN: { color: 'bg-gray-100 text-gray-700', icon: User },
  USER_REGISTER: { color: 'bg-blue-100 text-blue-700', icon: User },
  SCORE_GENERATED: { color: 'bg-purple-100 text-purple-700', icon: Activity },
  LOAN_APPLICATION: { color: 'bg-yellow-100 text-yellow-700', icon: DollarSign },
  LOAN_APPROVED: { color: 'bg-green-100 text-green-700', icon: DollarSign },
  LOAN_REJECTED: { color: 'bg-red-100 text-red-700', icon: DollarSign },
  LOAN_DISBURSED: { color: 'bg-purple-100 text-purple-700', icon: DollarSign },
  PROJECT_CREATED: { color: 'bg-blue-100 text-blue-700', icon: FolderKanban },
  BID_SUBMITTED: { color: 'bg-yellow-100 text-yellow-700', icon: FileText },
  BID_ACCEPTED: { color: 'bg-green-100 text-green-700', icon: FileText },
  MILESTONE_SUBMITTED: { color: 'bg-yellow-100 text-yellow-700', icon: Activity },
  MILESTONE_APPROVED: { color: 'bg-green-100 text-green-700', icon: Activity },
  DISPUTE_OPENED: { color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  DISPUTE_RESOLVED: { color: 'bg-green-100 text-green-700', icon: AlertTriangle },
  CONTRACT_ACTIVATED: { color: 'bg-blue-100 text-blue-700', icon: Shield },
  CONTRACT_FROZEN: { color: 'bg-red-100 text-red-700', icon: Shield },
};

const ROLE_COLORS: Record<string, string> = {
  company_user: 'bg-blue-100 text-blue-700',
  customer: 'bg-green-100 text-green-700',
  reviewer: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
  system: 'bg-gray-100 text-gray-700',
};

export default function AuditLogs() {
  const { auditLogs } = useData();
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterRole, setFilterRole] = useState('all');

  const filtered = auditLogs.filter(log => {
    const matchSearch = search === '' ||
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.actorName.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === 'all' || log.action === filterAction;
    const matchRole = filterRole === 'all' || log.actorRole === filterRole;
    return matchSearch && matchAction && matchRole;
  });

  const uniqueActions = [...new Set(auditLogs.map(l => l.action))];
  const uniqueRoles = [...new Set(auditLogs.map(l => l.actorRole))];

  const stats = [
    { label: 'Total Events', value: auditLogs.length },
    { label: 'Today', value: auditLogs.filter(l => l.createdAt.startsWith('2026-03-14')).length },
    { label: 'Users', value: [...new Set(auditLogs.map(l => l.actorId))].length },
    { label: 'Action Types', value: uniqueActions.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-gray-500 mt-1">Complete audit trail of all platform activities</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(({ label, value }) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-gray-900">{value}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input className="pl-10" placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Filter by action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map(a => <SelectItem key={a} value={a}>{a.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Filter by role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {uniqueRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Log count */}
          <div className="text-sm text-gray-500">Showing {filtered.length} of {auditLogs.length} events</div>

          {/* Logs */}
          <div className="space-y-2">
            {filtered.map(log => {
              const config = ACTION_CONFIG[log.action] || { color: 'bg-gray-100 text-gray-700', icon: Activity };
              const Icon = config.icon;
              return (
                <Card key={log.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${config.color} mr-2`}>
                              {log.action.replace(/_/g, ' ')}
                            </span>
                            <span className="text-sm text-gray-700">{log.details}</span>
                          </div>
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-gray-500">Actor: <strong>{log.actorName}</strong></span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${ROLE_COLORS[log.actorRole] || 'bg-gray-100 text-gray-700'}`}>
                            {log.actorRole.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-400">Target: {log.targetType} #{log.targetId}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filtered.length === 0 && (
              <Card className="text-center py-12">
                <CardContent>
                  <Activity className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No logs match your filters</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* JSON Export */}
          <Card>
            <CardHeader><CardTitle className="text-base">Export Statistics (JSON)</CardTitle></CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-900 text-green-400 rounded-xl p-4 overflow-auto max-h-48">
{JSON.stringify({
  totalEvents: auditLogs.length,
  byAction: uniqueActions.reduce((acc, a) => ({ ...acc, [a]: auditLogs.filter(l => l.action === a).length }), {}),
  byRole: uniqueRoles.reduce((acc, r) => ({ ...acc, [r]: auditLogs.filter(l => l.actorRole === r).length }), {}),
  recentEvents: auditLogs.slice(0, 3).map(l => ({ action: l.action, actor: l.actorName, date: l.createdAt })),
}, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}