import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../contexts/auth-context';
import { useData } from '../contexts/data-context';
import { Sidebar } from '../components/sidebar';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  AlertTriangle, CheckCircle, Clock, Shield, User, FolderKanban,
  MessageSquare, ArrowRight, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { Dispute } from '../contexts/data-context';

function DisputeStatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    open: 'bg-red-100 text-red-700',
    under_review: 'bg-yellow-100 text-yellow-700',
    resolved: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-500',
  };
  return <Badge className={config[status] || 'bg-gray-100 text-gray-700'}>{status.replace('_', ' ')}</Badge>;
}

function ResolveDialog({ dispute, onResolve }: { dispute: Dispute; onResolve: (resolution: string) => void }) {
  const [resolution, setResolution] = useState('');
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    if (!resolution.trim()) { toast.error('Please provide resolution details'); return; }
    onResolve(resolution);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1">
          <Eye className="w-3.5 h-3.5" />Resolve
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve Dispute</DialogTitle>
          <DialogDescription>Provide your resolution decision. This will unfreeze the contract.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm font-medium text-red-800 mb-1">Dispute Description</div>
            <p className="text-sm text-red-700">{dispute.description}</p>
            <div className="text-xs text-red-500 mt-2">Raised by {dispute.raisedBy} on {dispute.createdAt.split('T')[0]}</div>
          </div>
          <div className="space-y-2">
            <Label>Resolution Decision *</Label>
            <Textarea
              placeholder="Describe the resolution outcome and any corrective actions required..."
              value={resolution}
              onChange={e => setResolution(e.target.value)}
              rows={4}
            />
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-start gap-2">
            <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Resolving this dispute will unfreeze the contract and allow payments to proceed.</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSubmit} className="flex-1 bg-green-600 hover:bg-green-700">Confirm Resolution</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Disputes() {
  const { user } = useAuth();
  const { disputes, resolveDispute } = useData();

  const isReviewerOrAdmin = user?.role === 'reviewer' || user?.role === 'admin';
  const isCustomer = user?.role === 'customer';

  const myDisputes = isCustomer
    ? disputes.filter(d => d.raisedBy === user?.name)
    : disputes; // reviewer/admin see all

  const openDisputes = myDisputes.filter(d => d.status === 'open' || d.status === 'under_review');
  const resolvedDisputes = myDisputes.filter(d => d.status === 'resolved' || d.status === 'closed');

  const handleResolve = (disputeId: string, resolution: string) => {
    resolveDispute(disputeId, resolution, user!.id);
    toast.success('Dispute resolved. Contract unfrozen.');
  };

  const DisputeCard = ({ dispute }: { dispute: Dispute }) => (
    <Card className={`border-2 ${dispute.status === 'resolved' ? 'border-green-200' : 'border-red-200'} hover:shadow-sm transition-shadow`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${dispute.status === 'resolved' ? 'bg-green-100' : 'bg-red-100'}`}>
              {dispute.status === 'resolved' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div>
              <div className="font-semibold text-gray-900">{dispute.projectTitle}</div>
              {dispute.milestoneTitle && (
                <div className="text-sm text-gray-500">Milestone: {dispute.milestoneTitle}</div>
              )}
              <div className="text-xs text-gray-400 mt-0.5">#{dispute.id} · {dispute.createdAt.split('T')[0]}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <DisputeStatusBadge status={dispute.status} />
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <User className="w-3 h-3" />{dispute.raisedBy}
            </span>
          </div>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg mb-3">
          <div className="text-xs text-gray-500 mb-1">Complaint</div>
          <p className="text-sm text-gray-700">{dispute.description}</p>
        </div>

        {dispute.resolution && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-3">
            <div className="text-xs font-medium text-green-700 mb-1">Resolution</div>
            <p className="text-sm text-green-800">{dispute.resolution}</p>
            {dispute.resolvedAt && (
              <div className="text-xs text-green-500 mt-1">Resolved {dispute.resolvedAt.split('T')[0]}</div>
            )}
          </div>
        )}

        {dispute.status === 'open' && (
          <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg mb-3 text-xs text-red-700">
            <Shield className="w-3.5 h-3.5 flex-shrink-0" />Contract payments are frozen pending resolution
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <Link to={`/projects/${dispute.projectId}`}>
            <Button variant="outline" size="sm" className="gap-1">
              <FolderKanban className="w-3.5 h-3.5" />View Project
            </Button>
          </Link>
          {isReviewerOrAdmin && (dispute.status === 'open' || dispute.status === 'under_review') && (
            <ResolveDialog dispute={dispute} onResolve={(r) => handleResolve(dispute.id, r)} />
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Disputes</h1>
            <p className="text-gray-500 mt-1">
              {isReviewerOrAdmin ? 'Review and resolve project disputes' : 'Track your dispute cases'}
            </p>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Open', count: myDisputes.filter(d => d.status === 'open').length, icon: AlertTriangle, color: 'text-red-500' },
              { label: 'Under Review', count: myDisputes.filter(d => d.status === 'under_review').length, icon: Clock, color: 'text-yellow-500' },
              { label: 'Resolved', count: myDisputes.filter(d => d.status === 'resolved').length, icon: CheckCircle, color: 'text-green-500' },
              { label: 'Total', count: myDisputes.length, icon: MessageSquare, color: 'text-blue-500' },
            ].map(({ label, count, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-500 text-xs font-medium">{label}</span>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {isReviewerOrAdmin && openDisputes.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div>
                <div className="font-medium text-red-800">{openDisputes.length} dispute{openDisputes.length > 1 ? 's' : ''} require your attention</div>
                <div className="text-sm text-red-700">Affected contracts are frozen until resolved</div>
              </div>
            </div>
          )}

          <Tabs defaultValue="open">
            <TabsList>
              <TabsTrigger value="open">Open ({openDisputes.length})</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({resolvedDisputes.length})</TabsTrigger>
              <TabsTrigger value="all">All ({myDisputes.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="open" className="space-y-4">
              {openDisputes.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <CheckCircle className="w-12 h-12 mx-auto text-green-400 mb-3" />
                    <p className="text-gray-500">No open disputes</p>
                  </CardContent>
                </Card>
              ) : openDisputes.map(d => <DisputeCard key={d.id} dispute={d} />)}
            </TabsContent>

            <TabsContent value="resolved" className="space-y-4">
              {resolvedDisputes.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent><p className="text-gray-500">No resolved disputes</p></CardContent>
                </Card>
              ) : resolvedDisputes.map(d => <DisputeCard key={d.id} dispute={d} />)}
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              {myDisputes.map(d => <DisputeCard key={d.id} dispute={d} />)}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
