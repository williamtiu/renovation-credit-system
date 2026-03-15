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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import {
  DollarSign, CheckCircle, XCircle, Clock, AlertCircle, Building2,
  FolderKanban, TrendingUp, Award, FileText, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { LoanApplication } from '../contexts/data-context';

function LoanStatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    under_review: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    disbursed: 'bg-purple-100 text-purple-700',
    repaid: 'bg-gray-100 text-gray-500',
  };
  return <Badge className={config[status] || 'bg-gray-100 text-gray-700'}>{status.replace('_', ' ')}</Badge>;
}

function LoanReviewDialog({ loan, onReview }: { loan: LoanApplication; onReview: (status: 'approved' | 'rejected', note: string, rate?: number) => void }) {
  const [note, setNote] = useState('');
  const [rate, setRate] = useState('');
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);

  const handleSubmit = () => {
    if (!note) { toast.error('Please provide a review note'); return; }
    if (decision === 'approved' && !rate) { toast.error('Please specify an interest rate for approved loans'); return; }
    onReview(decision!, note, decision === 'approved' ? parseFloat(rate) : undefined);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1">
          <Eye className="w-3.5 h-3.5" />Review
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Loan Application Review</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Loan Details */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Applicant', value: loan.applicantName },
              { label: 'Company', value: loan.companyName || 'Individual' },
              { label: 'Amount', value: `$${loan.amount.toLocaleString()}` },
              { label: 'Term', value: `${loan.term} months` },
              { label: 'Trust Grade', value: loan.trustGrade || 'N/A' },
              { label: 'Credit Score', value: loan.creditScore?.toString() || 'N/A' },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500">{label}</div>
                <div className="font-medium text-gray-900 text-sm">{value}</div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">Purpose</div>
            <p className="text-sm text-gray-700">{loan.purpose}</p>
          </div>

          {loan.projectTitle && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-sm">
              <FolderKanban className="w-4 h-4 text-blue-600" />
              <span className="text-blue-700">Linked to project: <strong>{loan.projectTitle}</strong></span>
            </div>
          )}

          {/* Trust Score Visual */}
          {loan.creditScore && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Award className="w-6 h-6 text-blue-600" />
                <div>
                  <div className="font-semibold text-gray-900">Credit Assessment</div>
                  <div className="text-sm text-gray-600">Score: {loan.creditScore} · Grade {loan.trustGrade} · {loan.creditScore >= 3400 ? 'Low Risk' : loan.creditScore >= 3000 ? 'Medium Risk' : 'High Risk'}</div>
                </div>
                <div className="ml-auto">
                  <div className={`text-sm font-bold px-3 py-1 rounded-full ${loan.creditScore >= 3400 ? 'bg-green-100 text-green-700' : loan.creditScore >= 3000 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    {loan.creditScore >= 3400 ? 'Recommended' : loan.creditScore >= 3000 ? 'Conditional' : 'High Risk'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Decision */}
          <div>
            <Label className="mb-2 block">Decision</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDecision('approved')}
                className={`p-3 border-2 rounded-lg flex items-center gap-2 transition-colors ${decision === 'approved' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}
              >
                <CheckCircle className={`w-5 h-5 ${decision === 'approved' ? 'text-green-600' : 'text-gray-400'}`} />
                <span className={`font-medium ${decision === 'approved' ? 'text-green-800' : 'text-gray-600'}`}>Approve</span>
              </button>
              <button
                onClick={() => setDecision('rejected')}
                className={`p-3 border-2 rounded-lg flex items-center gap-2 transition-colors ${decision === 'rejected' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-300'}`}
              >
                <XCircle className={`w-5 h-5 ${decision === 'rejected' ? 'text-red-600' : 'text-gray-400'}`} />
                <span className={`font-medium ${decision === 'rejected' ? 'text-red-800' : 'text-gray-600'}`}>Reject</span>
              </button>
            </div>
          </div>

          {decision === 'approved' && (
            <div className="space-y-2">
              <Label>Interest Rate (% per annum) *</Label>
              <Input type="number" step="0.1" min="1" max="30" placeholder="e.g. 4.5" value={rate} onChange={e => setRate(e.target.value)} />
            </div>
          )}

          <div className="space-y-2">
            <Label>Review Note *</Label>
            <Textarea placeholder="Provide details about your decision..." value={note} onChange={e => setNote(e.target.value)} rows={3} />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!decision || !note}
              className={`flex-1 ${decision === 'approved' ? 'bg-green-600 hover:bg-green-700' : decision === 'rejected' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400'}`}
            >
              {decision === 'approved' ? 'Approve Loan' : decision === 'rejected' ? 'Reject Loan' : 'Make Decision'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Approvals() {
  const { user } = useAuth();
  const { loans, disputes, reviewLoan, disburseLoan } = useData();

  const pendingLoans = loans.filter(l => l.status === 'pending' || l.status === 'under_review');
  const reviewedLoans = loans.filter(l => l.status !== 'pending' && l.status !== 'under_review');

  const handleReview = (loanId: string, status: 'approved' | 'rejected', note: string, rate?: number) => {
    reviewLoan(loanId, status, note, user!.id, rate);
    toast.success(`Loan ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Loan Management</h1>
            <p className="text-gray-500 mt-1">Review and manage loan applications</p>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Pending Review', value: pendingLoans.length, icon: Clock, color: 'text-orange-500' },
              { label: 'Approved', value: loans.filter(l => l.status === 'approved' || l.status === 'disbursed').length, icon: CheckCircle, color: 'text-green-500' },
              { label: 'Rejected', value: loans.filter(l => l.status === 'rejected').length, icon: XCircle, color: 'text-red-500' },
              { label: 'Total Value', value: `$${(loans.filter(l => l.status === 'approved' || l.status === 'disbursed').reduce((s, l) => s + l.amount, 0) / 1000).toFixed(0)}K`, icon: DollarSign, color: 'text-blue-500' },
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

          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">Pending ({pendingLoans.length})</TabsTrigger>
              <TabsTrigger value="reviewed">Reviewed ({reviewedLoans.length})</TabsTrigger>
              <TabsTrigger value="all">All ({loans.length})</TabsTrigger>
            </TabsList>

            {[
              { key: 'pending', items: pendingLoans },
              { key: 'reviewed', items: reviewedLoans },
              { key: 'all', items: loans },
            ].map(({ key, items }) => (
              <TabsContent key={key} value={key} className="space-y-4">
                {items.length === 0 ? (
                  <Card className="text-center py-12">
                    <CardContent>
                      <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500">No {key} loan applications</p>
                    </CardContent>
                  </Card>
                ) : items.map(loan => (
                  <Card key={loan.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between flex-wrap gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <DollarSign className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{loan.applicantName}</div>
                            {loan.companyName && <div className="text-sm text-gray-500 flex items-center gap-1"><Building2 className="w-3 h-3" />{loan.companyName}</div>}
                            <div className="text-sm text-gray-500 mt-0.5">Applied: {loan.createdAt.split('T')[0]}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="text-right">
                            <div className="text-xl font-bold text-gray-900">${loan.amount.toLocaleString()}</div>
                            <div className="text-xs text-gray-500">{loan.term} months</div>
                          </div>
                          {loan.trustGrade && (
                            <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              <Award className="w-3 h-3" />Grade {loan.trustGrade}
                            </div>
                          )}
                          <LoanStatusBadge status={loan.status} />
                          {(loan.status === 'pending' || loan.status === 'under_review') && (
                            <LoanReviewDialog loan={loan} onReview={(s, n, r) => handleReview(loan.id, s, n, r)} />
                          )}
                          {loan.status === 'approved' && user?.role === 'admin' && (
                            <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => { disburseLoan(loan.id); toast.success('Loan disbursed!'); }}>
                              Disburse
                            </Button>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mt-3 p-3 bg-gray-50 rounded-lg">{loan.purpose}</p>

                      {loan.projectTitle && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-blue-600">
                          <FolderKanban className="w-3 h-3" />Project: {loan.projectTitle}
                        </div>
                      )}

                      {loan.reviewerNote && (
                        <div className={`mt-3 p-3 rounded-lg text-sm ${loan.status === 'approved' || loan.status === 'disbursed' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                          <div className="font-medium mb-0.5">Review Note</div>
                          {loan.reviewerNote}
                          {loan.reviewedAt && <div className="text-xs opacity-60 mt-1">Reviewed: {loan.reviewedAt.split('T')[0]}</div>}
                        </div>
                      )}

                      {loan.interestRate && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-green-700">
                          <TrendingUp className="w-4 h-4" />Interest Rate: {loan.interestRate}% p.a.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>
    </div>
  );
}
