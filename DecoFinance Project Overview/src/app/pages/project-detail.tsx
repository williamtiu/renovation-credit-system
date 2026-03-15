import { useState } from 'react';
import type { ComponentType } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useAuth } from '../contexts/auth-context';
import { useData } from '../contexts/data-context';
import { Sidebar } from '../components/sidebar';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  ArrowLeft, DollarSign, MapPin, Calendar, Building2, Award, CheckCircle,
  Clock, AlertTriangle, Upload, Gavel, FileText, Shield, Flag,
  Lock, Unlock, Package, ChevronRight, Star, Info, Search, FileSignature, PenLine, Users
} from 'lucide-react';
import { toast } from 'sonner';

function MilestoneStatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    planned: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-blue-100 text-blue-700',
    submitted: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    disputed: 'bg-red-100 text-red-700',
  };
  return <Badge className={config[status] || 'bg-gray-100 text-gray-700'}>{status.replace('_', ' ')}</Badge>;
}

function EscrowBadge({ state }: { state: string }) {
  const config: Record<string, { color: string; icon: ComponentType<{ className?: string }> }> = {
    planned: { color: 'bg-gray-100 text-gray-600', icon: Clock },
    locked: { color: 'bg-blue-100 text-blue-700', icon: Lock },
    pending: { color: 'bg-yellow-100 text-yellow-700', icon: Package },
    released: { color: 'bg-green-100 text-green-700', icon: Unlock },
    frozen: { color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  };
  const c = config[state] || config.planned;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${c.color}`}>
      <Icon className="w-3 h-3" />{state}
    </span>
  );
}

const CONTRACT_STATE_INFO: Record<string, { color: string; label: string; description: string }> = {
  draft: { color: 'bg-gray-100 text-gray-700', label: 'Draft', description: 'Contract created but not yet active' },
  pending_signatures: { color: 'bg-purple-100 text-purple-700', label: 'Pending Signatures', description: 'Awaiting signatures from both parties before activation' },
  active: { color: 'bg-green-100 text-green-700', label: 'Active', description: 'Project is in progress' },
  pending_review: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending Review', description: 'Awaiting milestone approval' },
  frozen: { color: 'bg-red-100 text-red-700', label: 'Frozen', description: 'Payments frozen due to dispute' },
  completed: { color: 'bg-blue-100 text-blue-700', label: 'Completed', description: 'All milestones approved and closed' },
  terminated: { color: 'bg-gray-100 text-gray-700', label: 'Terminated', description: 'Contract terminated' },
};

function StarSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(i)}
          className="p-0.5"
        >
          <Star className={`w-7 h-7 transition-colors ${i <= (hovered || value) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
        </button>
      ))}
      {value > 0 && <span className="ml-2 text-sm text-gray-600">{value}/5</span>}
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { projects, contracts, companies, acceptBid, submitMilestone, approveMilestone, openDispute, addCompanyReview, signContract, cancelDirectHire } = useData();
  const navigate = useNavigate();
  const [submitEvidence, setSubmitEvidence] = useState<{ [key: string]: string }>({});
  const [disputeForm, setDisputeForm] = useState({ description: '', milestoneId: '' });
  const [disputeDialog, setDisputeDialog] = useState(false);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    comment: '',
    professionalism: 0,
    quality: 0,
    timeliness: 0,
    communication: 0,
  });

  const project = projects.find(p => p.id === id);
  const contract = contracts.find(c => c.projectId === id);

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <main className="lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8">
          <div className="text-center py-20">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Project not found</h2>
            <Button onClick={() => navigate('/projects')} variant="outline">Back to Projects</Button>
          </div>
        </main>
      </div>
    );
  }

  const isCustomer = user?.id === project.customerId;
  const isContractor = user?.companyId === project.contractorId;
  const isReviewerOrAdmin = user?.role === 'reviewer' || user?.role === 'admin';
  const contractorCompany = companies.find(c => c.id === project.contractorId);

  const handleAcceptBid = (bidId: string) => {
    acceptBid(project.id, bidId);
    toast.success('Bid accepted! Contract created — both parties must sign to activate the project.');
  };

  const handleWithdrawDirectHire = (projectId: string) => {
    cancelDirectHire(projectId);
    toast.success('Direct hire request withdrawn. The project is now open again.');
  };

  const handleSignContract = () => {
    const signerRole = isCustomer ? 'customer' : 'contractor';
    signContract(project.id, signerRole);
    const contract = contracts.find(c => c.projectId === project.id);
    const otherSigned = isCustomer ? contract?.contractorSigned : contract?.customerSigned;
    if (otherSigned) {
      toast.success('Contract fully signed! Project is now active and work can begin.');
    } else {
      toast.success('You have signed the contract. Waiting for the other party to sign.');
    }
  };

  const handleSubmitMilestone = (milestoneId: string) => {
    const evidence = submitEvidence[milestoneId] || 'milestone-evidence.pdf';
    submitMilestone(milestoneId, evidence);
    toast.success('Milestone submitted for customer review');
  };

  const handleApproveMilestone = (milestoneId: string) => {
    approveMilestone(milestoneId);
    toast.success('Milestone approved! Funds released from escrow.');
  };

  const handleOpenDispute = (e: React.FormEvent) => {
    e.preventDefault();
    openDispute({
      projectId: project.id,
      projectTitle: project.title,
      milestoneId: disputeForm.milestoneId || undefined,
      milestoneTitle: project.milestones.find(m => m.id === disputeForm.milestoneId)?.title,
      raisedBy: user!.name,
      raisedByRole: user!.role || 'customer',
      description: disputeForm.description,
      status: 'open',
    });
    setDisputeDialog(false);
    setDisputeForm({ description: '', milestoneId: '' });
    toast.success('Dispute opened. Contract frozen pending review.');
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.rating) { toast.error('Please select a star rating'); return; }
    if (!reviewForm.comment.trim()) { toast.error('Please write a comment'); return; }
    if (!project.contractorId) return;
    addCompanyReview({
      companyId: project.contractorId,
      customerId: user!.id,
      customerName: user!.name,
      rating: reviewForm.rating,
      comment: reviewForm.comment,
      projectId: project.id,
      projectTitle: project.title,
      createdAt: new Date().toISOString().split('T')[0],
      categories: {
        professionalism: reviewForm.professionalism || reviewForm.rating,
        quality: reviewForm.quality || reviewForm.rating,
        timeliness: reviewForm.timeliness || reviewForm.rating,
        communication: reviewForm.communication || reviewForm.rating,
      },
    }, project.id);
    setReviewDialog(false);
    setReviewForm({ rating: 0, comment: '', professionalism: 0, quality: 0, timeliness: 0, communication: 0 });
    toast.success('Review submitted! Thank you for your feedback.');
  };

  const contractState = contract ? CONTRACT_STATE_INFO[contract.state] : null;
  const canLeaveReview = isCustomer && project.status === 'completed' && project.contractorId && !project.reviewed;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8">
        {/* Back */}
        <Button variant="ghost" onClick={() => navigate('/projects')} className="gap-2 mb-6 -ml-2">
          <ArrowLeft className="w-4 h-4" />Back to Projects
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
              <Badge className={
                project.status === 'open' ? 'bg-gray-100 text-gray-700' :
                project.status === 'bidding' ? 'bg-yellow-100 text-yellow-700' :
                project.status === 'awaiting_signatures' ? 'bg-purple-100 text-purple-700' :
                project.status === 'active' ? 'bg-blue-100 text-blue-700' :
                project.status === 'disputed' ? 'bg-red-100 text-red-700' :
                project.status === 'completed' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-700'
              }>
                {project.status === 'awaiting_signatures' ? 'Awaiting Signatures' : project.status}
              </Badge>
            </div>
            <p className="text-gray-500 mt-1">{project.description}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Customer: Leave review for completed projects */}
            {canLeaveReview && (
              <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-yellow-500 hover:bg-yellow-600 gap-2 text-white">
                    <Star className="w-4 h-4" />Rate & Review
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Rate Your Contractor</DialogTitle>
                    <DialogDescription>
                      How was your experience with {project.contractorName}?
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmitReview} className="space-y-5">
                    <div className="space-y-2">
                      <Label>Overall Rating *</Label>
                      <StarSelector value={reviewForm.rating} onChange={v => setReviewForm(f => ({ ...f, rating: v }))} />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm text-gray-600">Rate by category (optional)</Label>
                      {[
                        { key: 'professionalism', label: 'Professionalism' },
                        { key: 'quality', label: 'Work Quality' },
                        { key: 'timeliness', label: 'Timeliness' },
                        { key: 'communication', label: 'Communication' },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-3">
                          <span className="text-sm text-gray-600 w-32 flex-shrink-0">{label}</span>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map(i => (
                              <button key={i} type="button" onClick={() => setReviewForm(f => ({ ...f, [key]: i }))}>
                                <Star className={`w-5 h-5 transition-colors ${i <= (reviewForm as any)[key] ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label>Your Review *</Label>
                      <Textarea
                        placeholder="Share your experience with this contractor..."
                        value={reviewForm.comment}
                        onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                        rows={4}
                        required
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button type="button" variant="outline" onClick={() => setReviewDialog(false)} className="flex-1">Cancel</Button>
                      <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">Submit Review</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
            {project.reviewed && isCustomer && project.status === 'completed' && (
              <Badge className="bg-green-100 text-green-700 gap-1 px-3 py-1.5">
                <CheckCircle className="w-3.5 h-3.5" />Review Submitted
              </Badge>
            )}

            {/* Open dispute - for both parties during active */}
            {(isCustomer || isContractor) && project.status === 'active' && project.status !== 'awaiting_signatures' && (
              <Dialog open={disputeDialog} onOpenChange={setDisputeDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 text-red-600 border-red-200 hover:bg-red-50"><Flag className="w-4 h-4" />Open Dispute</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Open Dispute</DialogTitle>
                    <DialogDescription>This will freeze contract payments pending resolution</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleOpenDispute} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Related Milestone (optional)</Label>
                      <select className="w-full border rounded-lg px-3 py-2 text-sm" value={disputeForm.milestoneId} onChange={e => setDisputeForm(f => ({ ...f, milestoneId: e.target.value }))}>
                        <option value="">General dispute (no specific milestone)</option>
                        {project.milestones.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2"><Label>Description *</Label><Textarea value={disputeForm.description} onChange={e => setDisputeForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the issue in detail..." rows={4} required /></div>
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      <AlertTriangle className="w-4 h-4 inline mr-2" />Opening a dispute will freeze all contract payments until resolved.
                    </div>
                    <div className="flex gap-3">
                      <Button type="button" variant="outline" onClick={() => setDisputeDialog(false)} className="flex-1">Cancel</Button>
                      <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700">Open Dispute</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><DollarSign className="w-3.5 h-3.5" />Budget</div>
              <div className="font-bold text-gray-900">${project.budget.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><MapPin className="w-3.5 h-3.5" />Location</div>
              <div className="font-medium text-gray-900 text-sm leading-snug">{project.location || 'Not specified'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Calendar className="w-3.5 h-3.5" />Timeline</div>
              <div className="text-xs text-gray-900">{project.startDate} — {project.endDate || 'TBD'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Building2 className="w-3.5 h-3.5" />Contractor</div>
              <div className="font-medium text-gray-900 text-sm">
                {project.contractorName ? (
                  <Link to={`/companies/${project.contractorId}`} className="text-blue-600 hover:underline">
                    {project.contractorName}
                  </Link>
                ) : 'Not assigned'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contractor Trust Score Card (when contractor is assigned) */}
        {contractorCompany && (
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center overflow-hidden">
                    {contractorCompany.avatar ? (
                      <img src={contractorCompany.avatar} alt={contractorCompany.name} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{contractorCompany.name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      {contractorCompany.averageRating.toFixed(1)} · {contractorCompany.reviewCount} reviews
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-blue-200">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="text-xs text-gray-500">Trust Score</div>
                      <div className="font-bold text-blue-700 text-lg leading-tight">{contractorCompany.creditScore.toLocaleString()}</div>
                    </div>
                    <Badge className="ml-1 bg-blue-100 text-blue-700">Grade {contractorCompany.trustGrade}</Badge>
                  </div>
                  <Link to={`/companies/${contractorCompany.id}`}>
                    <Button size="sm" variant="outline" className="gap-1 text-blue-700 border-blue-300">
                      View Profile <ChevronRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── CONTRACT SIGNING WORKFLOW ─── */}
        {project.status === 'awaiting_signatures' && contract && (
          <Card className="mb-6 border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2 text-purple-900">
                  <FileSignature className="w-5 h-5 text-purple-600" />
                  Contract Signing Required
                </CardTitle>
                <Badge className="bg-purple-100 text-purple-700">Step 1 of 2</Badge>
              </div>
              <CardDescription className="text-purple-700">
                The project cannot begin until both the customer and contractor have reviewed and signed the contract.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Contract Summary */}
              <div className="bg-white border border-purple-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span className="font-semibold text-gray-900 text-sm">Contract Summary</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: 'Project', value: project.title },
                    { label: 'Contract Value', value: `$${contract.totalAmount.toLocaleString()}` },
                    { label: 'Customer', value: contract.customerName },
                    { label: 'Contractor', value: contract.contractorName },
                    { label: 'Created', value: contract.createdAt.split('T')[0] },
                    { label: 'Milestones', value: `${project.milestones.length} phases` },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div className="text-xs text-gray-500">{label}</div>
                      <div className="font-medium text-gray-900">{value}</div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-purple-100 pt-3 mt-1">
                  <div className="text-xs text-gray-500 mb-2">Project Milestones</div>
                  <div className="space-y-1">
                    {project.milestones.map((m, idx) => (
                      <div key={m.id} className="flex items-center gap-2 text-xs">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${m.isContractSigning ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                          {idx + 1}
                        </div>
                        <span className={`flex-1 ${m.isContractSigning ? 'font-semibold text-purple-700' : 'text-gray-700'}`}>{m.title}</span>
                        {!m.isContractSigning && <span className="text-gray-500">${m.amount.toLocaleString()}</span>}
                        {m.isContractSigning && <span className="text-purple-600 font-medium">— Required</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Signature Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={`flex items-center gap-3 p-3 rounded-xl border-2 ${contract.customerSigned ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${contract.customerSigned ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {contract.customerSigned ? <CheckCircle className="w-5 h-5 text-green-600" /> : <PenLine className="w-5 h-5 text-gray-400" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{contract.customerName}</div>
                    <div className={`text-xs ${contract.customerSigned ? 'text-green-600' : 'text-gray-400'}`}>
                      {contract.customerSigned ? `Signed ${contract.customerSignedAt?.split('T')[0]}` : 'Awaiting signature'}
                    </div>
                  </div>
                </div>
                <div className={`flex items-center gap-3 p-3 rounded-xl border-2 ${contract.contractorSigned ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${contract.contractorSigned ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {contract.contractorSigned ? <CheckCircle className="w-5 h-5 text-green-600" /> : <PenLine className="w-5 h-5 text-gray-400" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{contract.contractorName}</div>
                    <div className={`text-xs ${contract.contractorSigned ? 'text-green-600' : 'text-gray-400'}`}>
                      {contract.contractorSigned ? `Signed ${contract.contractorSignedAt?.split('T')[0]}` : 'Awaiting signature'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action */}
              {(isCustomer || isContractor) && (() => {
                const alreadySigned = isCustomer ? contract.customerSigned : contract.contractorSigned;
                return alreadySigned ? (
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-green-800">You have signed the contract</div>
                      <div className="text-xs text-green-600">Waiting for the other party to sign to activate the project.</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-purple-100 border border-purple-200 rounded-xl">
                    <div className="flex items-start gap-3 mb-3">
                      <Info className="w-5 h-5 text-purple-700 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-purple-800">
                        By signing, you confirm that you have read, understood, and agree to all terms and conditions of this renovation contract, including the milestone payment schedule and project specifications.
                      </div>
                    </div>
                    <button
                      onClick={handleSignContract}
                      className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                    >
                      <FileSignature className="w-5 h-5" />
                      Sign Contract
                    </button>
                  </div>
                );
              })()}

              {!isCustomer && !isContractor && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl text-sm text-gray-500">
                  <Users className="w-4 h-4" />
                  Waiting for customer and contractor signatures
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Smart Contract State */}
        {contract && contractState && (
          <Card className={`mb-6 border-2 ${contract.state === 'frozen' ? 'border-red-200' : contract.state === 'active' ? 'border-green-200' : 'border-gray-200'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="w-5 h-5 text-blue-600" />Smart Contract State
                </CardTitle>
                <Badge className={contractState.color}>{contractState.label}</Badge>
              </div>
              <CardDescription>{contractState.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Total Value', value: `$${contract.totalAmount.toLocaleString()}`, color: 'text-gray-900' },
                  { label: 'Locked in Escrow', value: `$${contract.lockedAmount.toLocaleString()}`, color: 'text-blue-700' },
                  { label: 'Released', value: `$${contract.releasedAmount.toLocaleString()}`, color: 'text-green-700' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">{label}</div>
                    <div className={`font-bold text-lg ${color}`}>{value}</div>
                  </div>
                ))}
              </div>
              {contract.state === 'frozen' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span className="text-sm text-red-700">Contract is frozen due to an active dispute. Payments are suspended until the dispute is resolved.</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue={project.status === 'awaiting_signatures' ? 'milestones' : 'bids'}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="bids">Bids ({project.bids.length})</TabsTrigger>
            <TabsTrigger value="milestones">Milestones ({project.milestones.length})</TabsTrigger>
            <TabsTrigger value="disputes">Disputes ({project.disputes.length})</TabsTrigger>
            <TabsTrigger value="contract">
              Contract{project.status === 'awaiting_signatures' ? ' ✍️' : ''}
            </TabsTrigger>
          </TabsList>

          {/* Bids Tab */}
          <TabsContent value="bids" className="space-y-4">
            {project.bids.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Gavel className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No bids yet</p>
                </CardContent>
              </Card>
            ) : project.bids.map(bid => {
              const bidCompany = companies.find(c => c.id === bid.companyId);
              return (
                <Card key={bid.id} className={bid.status === 'accepted' ? 'border-green-300' : ''}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {bidCompany?.avatar ? (
                            <img src={bidCompany.avatar} alt={bid.companyName} className="w-full h-full object-cover" />
                          ) : (
                            <Building2 className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{bid.companyName}</div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Award className="w-3.5 h-3.5 text-yellow-500" />
                              Grade {bid.trustGrade} · Score {bid.creditScore}
                            </span>
                            {bidCompany && (
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                {bidCompany.averageRating.toFixed(1)} ({bidCompany.reviewCount} reviews)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xl font-bold text-gray-900">${bid.amount.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">{bid.timeline}</div>
                        </div>
                        {bid.status === 'accepted' ? (
                          <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Accepted</Badge>
                        ) : bid.status === 'rejected' ? (
                          <Badge className="bg-red-100 text-red-700">Rejected</Badge>
                        ) : isCustomer && project.isDirectHire && project.directHireStatus === 'pending' && bid.companyId === project.directHireCompanyId ? (
                          <div className="flex flex-col items-end gap-1.5">
                            <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1">
                              <Clock className="w-3 h-3" />Awaiting Response
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-7"
                              onClick={() => handleWithdrawDirectHire(project.id)}
                            >
                              Withdraw Request
                            </Button>
                          </div>
                        ) : isCustomer && project.status === 'bidding' ? (
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleAcceptBid(bid.id)}>
                            Accept Bid
                          </Button>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-3 p-3 bg-gray-50 rounded-lg">{bid.proposal}</p>
                    {bidCompany && (
                      <div className="mt-3">
                        <Link to={`/companies/${bidCompany.id}`}>
                          <Button variant="outline" size="sm" className="gap-1 text-xs">
                            View Company Profile <ChevronRight className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/* Find Companies Banner — shown for customers on open/bidding projects */}
            {isCustomer && (project.status === 'open' || project.status === 'bidding') && (
              <div className="flex items-center justify-between gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Search className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {project.bids.length === 0 ? 'No bids yet?' : 'Not satisfied with the current bids?'}
                    </div>
                    <div className="text-sm text-gray-500">Browse verified contractors and send direct hire requests</div>
                  </div>
                </div>
                <Link to="/companies" className="flex-shrink-0">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-2 whitespace-nowrap">
                    <Search className="w-3.5 h-3.5" />Find Companies
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>

          {/* Milestones Tab */}
          <TabsContent value="milestones" className="space-y-4">
            {/* Info note for customers */}
            {isCustomer && (project.status === 'active' || project.status === 'awaiting_signatures') && (
              <div className={`flex items-start gap-3 p-4 border rounded-xl ${project.status === 'awaiting_signatures' ? 'bg-purple-50 border-purple-100' : 'bg-blue-50 border-blue-100'}`}>
                <Info className={`w-5 h-5 flex-shrink-0 mt-0.5 ${project.status === 'awaiting_signatures' ? 'text-purple-600' : 'text-blue-600'}`} />
                <div>
                  <div className={`text-sm font-medium ${project.status === 'awaiting_signatures' ? 'text-purple-800' : 'text-blue-800'}`}>Platform-Managed Milestones</div>
                  <div className={`text-sm mt-0.5 ${project.status === 'awaiting_signatures' ? 'text-purple-700' : 'text-blue-700'}`}>
                    {project.status === 'awaiting_signatures'
                      ? 'The milestone schedule has been set. Step 1 is Contract Signing — both parties must sign the contract above before work can begin.'
                      : 'Milestones are set by the platform at contract signing based on standard renovation phases. Your role is to review and approve milestone submissions from the contractor when work is completed.'}
                  </div>
                </div>
              </div>
            )}
            {project.milestones.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <CheckCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No milestones yet. Milestones are created automatically when a bid is accepted.</p>
                </CardContent>
              </Card>
            ) : project.milestones.map((milestone, idx) => (
              <Card key={milestone.id} className={
                milestone.isContractSigning ? 'border-purple-200 bg-purple-50/20' :
                milestone.status === 'disputed' ? 'border-red-200' :
                milestone.status === 'approved' ? 'border-green-200' : ''
              }>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        milestone.isContractSigning ? 'bg-purple-100 text-purple-600' :
                        milestone.status === 'approved' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {milestone.isContractSigning ? <FileSignature className="w-4 h-4" /> :
                         milestone.status === 'approved' ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{milestone.title}</span>
                          {milestone.isContractSigning && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Contract Phase</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{milestone.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {!milestone.isContractSigning && (
                        <div className="text-right">
                          <div className="font-bold text-gray-900">${milestone.amount.toLocaleString()}</div>
                          {milestone.dueDate && <div className="text-xs text-gray-500">Due: {milestone.dueDate}</div>}
                        </div>
                      )}
                      <MilestoneStatusBadge status={milestone.status} />
                      {!milestone.isContractSigning && <EscrowBadge state={milestone.escrowState} />}
                    </div>
                  </div>

                  {milestone.isContractSigning && milestone.status === 'approved' && milestone.approvedAt && (
                    <div className="mt-3 p-2 bg-purple-50 border border-purple-100 rounded flex items-center gap-2 text-sm text-purple-700">
                      <FileSignature className="w-4 h-4" />Contract signed and activated on {milestone.approvedAt.split('T')[0]}
                    </div>
                  )}

                  {milestone.evidence && !milestone.isContractSigning && (
                    <div className="mt-3 p-2 bg-blue-50 rounded flex items-center gap-2 text-sm text-blue-700">
                      <FileText className="w-4 h-4" />{milestone.evidence}
                      {milestone.submittedAt && <span className="text-xs text-blue-500">Submitted {milestone.submittedAt.split('T')[0]}</span>}
                    </div>
                  )}

                  {!milestone.isContractSigning && (
                    <div className="flex gap-2 mt-4 flex-wrap">
                      {/* Company: Submit milestone */}
                      {isContractor && milestone.status === 'in_progress' && (
                        <div className="flex gap-2 flex-1">
                          <Input placeholder="Evidence file name" className="text-sm"
                            value={submitEvidence[milestone.id] || ''}
                            onChange={e => setSubmitEvidence(prev => ({ ...prev, [milestone.id]: e.target.value }))} />
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap" onClick={() => handleSubmitMilestone(milestone.id)}>
                            <Upload className="w-3.5 h-3.5 mr-1" />Submit
                          </Button>
                        </div>
                      )}
                      {/* Company can also submit planned milestones */}
                      {isContractor && milestone.status === 'planned' && project.status === 'active' && (
                        <div className="flex gap-2 flex-1">
                          <Input placeholder="Evidence file name" className="text-sm"
                            value={submitEvidence[milestone.id] || ''}
                            onChange={e => setSubmitEvidence(prev => ({ ...prev, [milestone.id]: e.target.value }))} />
                          <Button size="sm" variant="outline" className="whitespace-nowrap" onClick={() => handleSubmitMilestone(milestone.id)}>
                            <Upload className="w-3.5 h-3.5 mr-1" />Submit for Review
                          </Button>
                        </div>
                      )}
                      {/* Customer: Approve milestone */}
                      {isCustomer && milestone.status === 'submitted' && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApproveMilestone(milestone.id)}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />Approve & Release Funds
                        </Button>
                      )}
                      {milestone.approvedAt && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />Approved {milestone.approvedAt.split('T')[0]}
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Disputes Tab */}
          <TabsContent value="disputes" className="space-y-4">
            {project.disputes.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <AlertTriangle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No disputes on this project</p>
                </CardContent>
              </Card>
            ) : project.disputes.map(dispute => (
              <Card key={dispute.id} className="border-red-200">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-gray-900">Dispute #{dispute.id}</div>
                        <div className="text-sm text-gray-500">Raised by {dispute.raisedBy} on {dispute.createdAt.split('T')[0]}</div>
                      </div>
                    </div>
                    <Badge className={dispute.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {dispute.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  {dispute.milestoneTitle && (
                    <div className="text-sm text-gray-600 mb-2"><strong>Related milestone:</strong> {dispute.milestoneTitle}</div>
                  )}
                  <p className="text-sm text-gray-700 bg-red-50 p-3 rounded-lg">{dispute.description}</p>
                  {dispute.resolution && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-xs text-green-700 font-medium mb-1">Resolution</div>
                      <p className="text-sm text-green-800">{dispute.resolution}</p>
                    </div>
                  )}
                  {isReviewerOrAdmin && (
                    <div className="mt-3">
                      <Link to="/disputes">
                        <Button variant="outline" size="sm" className="gap-1">Manage Dispute <ChevronRight className="w-3 h-3" /></Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Contract Tab */}
          <TabsContent value="contract">
            {contract ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" />Smart Contract Details
                  </CardTitle>
                  <CardDescription>Internal escrow and contract state tracking</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Signature Status Panel */}
                    {(contract.state === 'pending_signatures' || contract.customerSigned !== undefined) && (
                      <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-3">
                        <div className="flex items-center gap-2">
                          <FileSignature className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-semibold text-purple-900">Signature Status</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${contract.customerSigned ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                            {contract.customerSigned ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" /> : <PenLine className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                            <div>
                              <div className="text-xs font-medium text-gray-900">{contract.customerName}</div>
                              <div className={`text-xs ${contract.customerSigned ? 'text-green-600' : 'text-gray-400'}`}>
                                {contract.customerSigned ? 'Signed' : 'Pending'}
                              </div>
                            </div>
                          </div>
                          <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${contract.contractorSigned ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                            {contract.contractorSigned ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" /> : <PenLine className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                            <div>
                              <div className="text-xs font-medium text-gray-900">{contract.contractorName}</div>
                              <div className={`text-xs ${contract.contractorSigned ? 'text-green-600' : 'text-gray-400'}`}>
                                {contract.contractorSigned ? 'Signed' : 'Pending'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Contract ID', value: contract.id },
                        { label: 'State', value: contractState?.label || contract.state },
                        { label: 'Contractor', value: contract.contractorName },
                        { label: 'Customer', value: contract.customerName },
                        { label: 'Total Amount', value: `$${contract.totalAmount.toLocaleString()}` },
                        { label: 'Activated', value: contract.activatedAt?.split('T')[0] || (contract.state === 'pending_signatures' ? 'Awaiting signatures' : 'N/A') },
                      ].map(({ label, value }) => (
                        <div key={label} className="p-3 bg-gray-50 rounded-lg">
                          <div className="text-xs text-gray-500 mb-1">{label}</div>
                          <div className="font-medium text-gray-900 text-sm">{value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <div className="text-sm font-medium text-gray-700">Milestone & Escrow Ledger</div>
                      {project.milestones.map((m, idx) => (
                        <div key={m.id} className={`flex items-center gap-3 p-3 border rounded-lg ${m.isContractSigning ? 'border-purple-200 bg-purple-50/30' : ''}`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${m.isContractSigning ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                            {m.isContractSigning ? <FileSignature className="w-3 h-3" /> : idx + 1}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium flex items-center gap-1.5">
                              {m.title}
                              {m.isContractSigning && <span className="text-xs text-purple-600 font-medium">(Contract Phase)</span>}
                            </div>
                            {!m.isContractSigning && <div className="text-xs text-gray-500">${m.amount.toLocaleString()}</div>}
                          </div>
                          {!m.isContractSigning && <EscrowBadge state={m.escrowState} />}
                          {m.isContractSigning && (
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${m.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                              {m.status === 'approved' ? 'Signed' : 'Pending Signatures'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="text-sm font-medium text-blue-900 mb-3">Contract Summary</div>
                      <div className="space-y-2">
                        {[
                          { label: 'Total Contract Value', value: `$${contract.totalAmount.toLocaleString()}`, bold: true },
                          { label: 'Released to Contractor', value: `$${contract.releasedAmount.toLocaleString()}`, color: 'text-green-700' },
                          { label: 'Currently in Escrow', value: `$${contract.lockedAmount.toLocaleString()}`, color: 'text-blue-700' },
                          { label: 'Remaining', value: `$${Math.max(0, contract.totalAmount - contract.lockedAmount - contract.releasedAmount).toLocaleString()}`, color: 'text-gray-700' },
                        ].map(({ label, value, bold, color }) => (
                          <div key={label} className="flex justify-between text-sm">
                            <span className="text-blue-700">{label}</span>
                            <span className={`font-semibold ${color || 'text-blue-900'}`}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Shield className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No contract yet. Accept a bid to activate the smart contract.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}