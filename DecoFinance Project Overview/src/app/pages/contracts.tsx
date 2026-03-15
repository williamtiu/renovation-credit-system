import { Link } from 'react-router';
import { useAuth } from '../contexts/auth-context';
import { useData } from '../contexts/data-context';
import { Sidebar } from '../components/sidebar';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  Shield, Lock, Unlock, AlertTriangle, CheckCircle, Clock,
  Building2, User, DollarSign, ArrowRight, Package
} from 'lucide-react';

const CONTRACT_CONFIG: Record<string, { label: string; color: string; border: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', border: 'border-gray-200' },
  active: { label: 'Active', color: 'bg-green-100 text-green-700', border: 'border-green-200' },
  pending_review: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-700', border: 'border-yellow-200' },
  frozen: { label: 'Frozen', color: 'bg-red-100 text-red-700', border: 'border-red-300' },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
  terminated: { label: 'Terminated', color: 'bg-gray-100 text-gray-500', border: 'border-gray-200' },
};

function EscrowIcon({ state }: { state: string }) {
  if (state === 'released') return <Unlock className="w-4 h-4 text-green-500" />;
  if (state === 'locked') return <Lock className="w-4 h-4 text-blue-500" />;
  if (state === 'frozen') return <AlertTriangle className="w-4 h-4 text-red-500" />;
  if (state === 'pending') return <Clock className="w-4 h-4 text-yellow-500" />;
  return <Package className="w-4 h-4 text-gray-400" />;
}

export default function Contracts() {
  const { user } = useAuth();
  const { contracts, projects } = useData();

  const myContracts = contracts.filter(c => {
    if (user?.role === 'company_user') return c.contractorId === user.companyId;
    if (user?.role === 'customer') return c.customerId === user.id;
    return true; // reviewer/admin see all
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Smart Contracts</h1>
            <p className="text-gray-500 mt-1">Track contract states, escrow balances, and milestones</p>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Active', count: myContracts.filter(c => c.state === 'active').length, color: 'text-green-500' },
              { label: 'Pending Review', count: myContracts.filter(c => c.state === 'pending_review').length, color: 'text-yellow-500' },
              { label: 'Frozen', count: myContracts.filter(c => c.state === 'frozen').length, color: 'text-red-500' },
              { label: 'Completed', count: myContracts.filter(c => c.state === 'completed').length, color: 'text-blue-500' },
            ].map(({ label, count, color }) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <div className={`text-2xl font-bold ${color}`}>{count}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Contract List */}
          <div className="space-y-4">
            {myContracts.length === 0 ? (
              <Card className="text-center py-16">
                <CardContent>
                  <Shield className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-2">No contracts yet</h3>
                  <p className="text-gray-500 text-sm">Contracts are created when a bid is accepted on a project</p>
                </CardContent>
              </Card>
            ) : myContracts.map(contract => {
              const project = projects.find(p => p.id === contract.projectId);
              const config = CONTRACT_CONFIG[contract.state] || CONTRACT_CONFIG.draft;
              const progressPct = contract.totalAmount > 0 ? ((contract.releasedAmount) / contract.totalAmount) * 100 : 0;

              return (
                <Card key={contract.id} className={`border-2 ${config.border} hover:shadow-md transition-shadow`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Shield className="w-4 h-4 text-blue-600" />
                          {contract.projectTitle}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-1 flex-wrap">
                          <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{contract.contractorName}</span>
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{contract.customerName}</span>
                          {contract.activatedAt && <span>Activated: {contract.activatedAt.split('T')[0]}</span>}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={config.color}>{config.label}</Badge>
                        {contract.state === 'frozen' && (
                          <div className="flex items-center gap-1 text-red-600 text-xs font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" />Payments Frozen
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Financial Overview */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[
                        { label: 'Contract Value', value: `$${contract.totalAmount.toLocaleString()}`, color: 'text-gray-900' },
                        { label: 'In Escrow', value: `$${contract.lockedAmount.toLocaleString()}`, color: 'text-blue-700' },
                        { label: 'Released', value: `$${contract.releasedAmount.toLocaleString()}`, color: 'text-green-700' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-xs text-gray-500 mb-1">{label}</div>
                          <div className={`font-bold ${color}`}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Release Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Payment Release Progress</span>
                        <span>{progressPct.toFixed(0)}%</span>
                      </div>
                      <Progress value={progressPct} className="h-2" />
                    </div>

                    {/* Milestone Escrow States */}
                    {project?.milestones && project.milestones.length > 0 && (
                      <div className="space-y-2 mb-4">
                        <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Milestone Escrow States</div>
                        {project.milestones.map((m, idx) => (
                          <div key={m.id} className="flex items-center gap-3 p-2.5 border rounded-lg bg-white">
                            <EscrowIcon state={m.escrowState} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">{m.title}</div>
                              <div className="text-xs text-gray-500">${m.amount.toLocaleString()}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                m.escrowState === 'released' ? 'bg-green-100 text-green-700' :
                                m.escrowState === 'locked' ? 'bg-blue-100 text-blue-700' :
                                m.escrowState === 'frozen' ? 'bg-red-100 text-red-700' :
                                m.escrowState === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>{m.escrowState}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <Link to={`/projects/${contract.projectId}`}>
                      <Button variant="outline" size="sm" className="gap-1">
                        View Project <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
