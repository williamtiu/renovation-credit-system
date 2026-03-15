import { useState } from 'react';
import { useAuth } from '../contexts/auth-context';
import { useData } from '../contexts/data-context';
import { Sidebar } from '../components/sidebar';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Progress } from '../components/ui/progress';
import {
  DollarSign, Plus, Clock, CheckCircle, XCircle, AlertCircle,
  TrendingUp, FileText, Calendar, Building2, FolderKanban
} from 'lucide-react';
import { toast } from 'sonner';

function LoanStatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: React.ComponentType<{className?:string}> }> = {
    pending: { color: 'bg-gray-100 text-gray-700', icon: Clock },
    under_review: { color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
    approved: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
    rejected: { color: 'bg-red-100 text-red-700', icon: XCircle },
    disbursed: { color: 'bg-purple-100 text-purple-700', icon: DollarSign },
    repaid: { color: 'bg-gray-100 text-gray-600', icon: CheckCircle },
  };
  const c = config[status] || config.pending;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${c.color}`}>
      <Icon className="w-3 h-3" />{status.replace('_', ' ')}
    </span>
  );
}

export default function LoanApplication() {
  const { user } = useAuth();
  const { loans, projects, applyForLoan, disburseLoan } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    purpose: '',
    term: '12',
    projectId: '',
  });

  // Only company_user role can access loan applications
  if (user?.role === 'customer') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <main className="lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8">
          <div className="text-center py-20">
            <DollarSign className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Financing for Contractors Only</h2>
            <p className="text-gray-500 max-w-md mx-auto">Loan applications are available exclusively for registered renovation companies. This feature helps contractors finance their projects and operations.</p>
          </div>
        </main>
      </div>
    );
  }

  const myLoans = loans.filter(l => l.applicantId === user?.id || l.companyId === user?.companyId);
  const myProjects = projects.filter(p => p.customerId === user?.id || p.contractorId === user?.companyId);

  const totalApproved = myLoans.filter(l => l.status === 'approved' || l.status === 'disbursed' || l.status === 'repaid').reduce((s, l) => s + l.amount, 0);
  const totalRepaid = myLoans.filter(l => l.status === 'repaid').reduce((s, l) => s + (l.repaidAmount || 0), 0);
  const totalDisbursed = myLoans.filter(l => l.status === 'disbursed').reduce((s, l) => s + (l.disbursedAmount || 0), 0);

  const estimatedRate = () => {
    if (!user?.creditScore) return '5.5 - 8.5%';
    if (user.creditScore >= 3500) return '3.5 - 4.5%';
    if (user.creditScore >= 3200) return '4.5 - 5.5%';
    if (user.creditScore >= 3000) return '5.5 - 7%';
    return '7 - 10%';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) < 1000) { toast.error('Minimum loan amount is $1,000'); return; }
    applyForLoan({
      applicantId: user!.id,
      applicantName: user!.name,
      companyId: user?.companyId,
      companyName: user?.companyName,
      projectId: form.projectId || undefined,
      projectTitle: myProjects.find(p => p.id === form.projectId)?.title,
      amount: parseFloat(form.amount),
      purpose: form.purpose,
      term: parseInt(form.term),
      trustGrade: user?.trustGrade,
      creditScore: user?.creditScore,
    });
    setDialogOpen(false);
    setForm({ amount: '', purpose: '', term: '12', projectId: '' });
    toast.success('Loan application submitted successfully!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8">
        <div className="space-y-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Loan Applications</h1>
              <p className="text-gray-500 mt-1">Apply for renovation financing and track your applications</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 gap-2"><Plus className="w-4 h-4" />New Application</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Loan Application</DialogTitle>
                  <DialogDescription>Apply for renovation financing</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Loan Amount ($) *</Label>
                      <Input type="number" min="1000" placeholder="100000" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Loan Term</Label>
                      <Select value={form.term} onValueChange={v => setForm(f => ({ ...f, term: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['6', '12', '18', '24', '36', '48', '60'].map(t => <SelectItem key={t} value={t}>{t} months</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Link to Project (optional)</Label>
                    <Select value={form.projectId} onValueChange={v => setForm(f => ({ ...f, projectId: v === 'none' ? '' : v }))}>
                      <SelectTrigger><SelectValue placeholder="Select project (optional)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {myProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Purpose *</Label>
                    <Textarea placeholder="Describe the purpose of this loan..." value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} rows={3} required />
                  </div>
                  {user?.creditScore && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">Estimated Interest Rate</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-700">{estimatedRate()}</div>
                      <div className="text-xs text-blue-600 mt-0.5">Based on your trust score of {user.creditScore} (Grade {user.trustGrade})</div>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancel</Button>
                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">Submit Application</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Applications', value: myLoans.length, icon: FileText, color: 'text-blue-500' },
              { label: 'Total Approved', value: `$${(totalApproved / 1000).toFixed(0)}K`, icon: CheckCircle, color: 'text-green-500' },
              { label: 'Disbursed', value: `$${(totalDisbursed / 1000).toFixed(0)}K`, icon: DollarSign, color: 'text-purple-500' },
              { label: 'Repaid', value: `$${(totalRepaid / 1000).toFixed(0)}K`, icon: TrendingUp, color: 'text-teal-500' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-500 text-xs font-medium">{label}</span>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Rate Calculator Card */}
          {user?.role === 'company_user' && user.creditScore && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-5">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 mb-1">Your Credit-Based Rate</h3>
                    <p className="text-sm text-blue-700">Trust Score {user.creditScore} (Grade {user.trustGrade}) qualifies you for preferential rates</p>
                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                      <div>
                        <div className="text-2xl font-bold text-blue-700">{estimatedRate()}</div>
                        <div className="text-xs text-blue-600">Estimated annual rate</div>
                      </div>
                      <div className="h-10 w-px bg-blue-300 hidden sm:block" />
                      <div>
                        <div className="text-sm text-blue-700">Max Loan Amount</div>
                        <div className="font-bold text-blue-900">$500,000</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loans List */}
          <div className="space-y-4">
            {myLoans.length === 0 ? (
              <Card className="text-center py-16">
                <CardContent>
                  <DollarSign className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-2">No loan applications</h3>
                  <p className="text-gray-500 text-sm mb-4">Apply for renovation financing to get started</p>
                  <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />Apply Now
                  </Button>
                </CardContent>
              </Card>
            ) : myLoans.map(loan => (
              <Card key={loan.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">${loan.amount.toLocaleString()} Loan</div>
                        <div className="text-sm text-gray-500">{loan.term} months · Applied {loan.createdAt.split('T')[0]}</div>
                        {loan.projectTitle && (
                          <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
                            <FolderKanban className="w-3 h-3" />{loan.projectTitle}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {loan.interestRate && (
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">{loan.interestRate}% p.a.</div>
                          <div className="text-xs text-gray-500">Interest rate</div>
                        </div>
                      )}
                      <LoanStatusBadge status={loan.status} />
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mt-3 p-3 bg-gray-50 rounded-lg line-clamp-2">{loan.purpose}</p>

                  {/* Repayment Progress */}
                  {(loan.status === 'disbursed' || loan.status === 'repaid') && loan.disbursedAmount && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Repayment Progress</span>
                        <span>${(loan.repaidAmount || 0).toLocaleString()} / ${loan.disbursedAmount.toLocaleString()}</span>
                      </div>
                      <Progress value={((loan.repaidAmount || 0) / loan.disbursedAmount) * 100} className="h-2" />
                    </div>
                  )}

                  {/* Reviewer Note */}
                  {loan.reviewerNote && (
                    <div className={`mt-3 p-3 rounded-lg text-sm ${loan.status === 'approved' || loan.status === 'disbursed' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                      <div className="font-medium mb-1">Reviewer Note</div>
                      {loan.reviewerNote}
                    </div>
                  )}

                  {/* Actions */}
                  {loan.status === 'approved' && user?.role === 'admin' && (
                    <Button size="sm" className="mt-3 bg-purple-600 hover:bg-purple-700" onClick={() => { disburseLoan(loan.id); toast.success('Loan disbursed!'); }}>
                      Disburse Loan
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}