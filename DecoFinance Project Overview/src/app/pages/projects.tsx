import { useState } from 'react';
import { Link } from 'react-router';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  FolderKanban, Plus, Search, MapPin, DollarSign, Calendar, AlertTriangle,
  Award, ArrowRight, Filter, Building2, CheckCircle, Clock, Gavel, Send, FileSignature
} from 'lucide-react';
import { toast } from 'sonner';

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    open: 'bg-gray-100 text-gray-700',
    bidding: 'bg-yellow-100 text-yellow-700',
    awaiting_signatures: 'bg-purple-100 text-purple-700',
    active: 'bg-blue-100 text-blue-700',
    disputed: 'bg-red-100 text-red-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-500',
  };
  const labels: Record<string, string> = {
    awaiting_signatures: 'Awaiting Signatures',
  };
  return <Badge className={config[status] || 'bg-gray-100 text-gray-700'}>{labels[status] || status}</Badge>;
}

// ─── Customer: My Projects ──────────────────────────────────────────────────────

function CustomerProjects() {
  const { user } = useAuth();
  const { projects, addProject } = useData();
  const [newProject, setNewProject] = useState({ title: '', description: '', location: '', budget: '', startDate: '', endDate: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState('all');

  const myProjects = projects.filter(p => p.customerId === user?.id);
  const directHireProjects = myProjects.filter(p => p.isDirectHire);
  const regularProjects = myProjects.filter(p => !p.isDirectHire);
  const filtered = filter === 'all' ? regularProjects :
    filter === 'direct_hire' ? directHireProjects :
    myProjects.filter(p => p.status === filter);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.title || !newProject.budget) { toast.error('Please fill in all required fields'); return; }
    addProject({
      title: newProject.title,
      description: newProject.description,
      customerId: user!.id,
      customerName: user!.name,
      location: newProject.location,
      budget: parseFloat(newProject.budget),
      startDate: newProject.startDate,
      endDate: newProject.endDate,
      status: 'open',
    });
    setDialogOpen(false);
    setNewProject({ title: '', description: '', location: '', budget: '', startDate: '', endDate: '' });
    toast.success('Project created successfully!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
          <p className="text-gray-500 mt-1">Create and manage your renovation projects</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2"><Plus className="w-4 h-4" />New Project</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>Post a renovation project to receive bids from verified contractors</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Project Title *</Label>
                <Input placeholder="e.g. Office Renovation — Level 3" value={newProject.title} onChange={e => setNewProject(p => ({ ...p, title: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Describe the scope of work..." value={newProject.description} onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input placeholder="City, State" value={newProject.location} onChange={e => setNewProject(p => ({ ...p, location: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Budget ($) *</Label>
                  <Input type="number" placeholder="150000" value={newProject.budget} onChange={e => setNewProject(p => ({ ...p, budget: e.target.value }))} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={newProject.startDate} onChange={e => setNewProject(p => ({ ...p, startDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={newProject.endDate} onChange={e => setNewProject(p => ({ ...p, endDate: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">Create Project</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'All Projects' },
          { key: 'direct_hire', label: `Direct Hire Requests${directHireProjects.length > 0 ? ` (${directHireProjects.length})` : ''}` },
          { key: 'open', label: 'Open' },
          { key: 'bidding', label: 'Bidding' },
          { key: 'awaiting_signatures', label: 'Awaiting Signatures' },
          { key: 'active', label: 'Active' },
          { key: 'disputed', label: 'Disputed' },
          { key: 'completed', label: 'Completed' },
        ].map(({ key, label }) => (
          <Button key={key} variant={filter === key ? 'default' : 'outline'} size="sm" onClick={() => setFilter(key)}
            className={`${filter === key ? 'bg-blue-600 hover:bg-blue-700' : ''} ${key === 'direct_hire' ? (filter === key ? '' : 'border-orange-300 text-orange-700 hover:bg-orange-50') : ''}`}>
            {key === 'direct_hire' && <Send className="w-3 h-3 mr-1.5" />}
            {label}
          </Button>
        ))}
      </div>

      {/* Direct Hire highlighted section when that filter is active */}
      {filter === 'direct_hire' && (
        <div>
          {directHireProjects.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <Send className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">No Direct Hire Requests</h3>
                <p className="text-gray-500 text-sm mb-4">Browse contractors and send a direct hire request from a company's profile page.</p>
                <Link to="/companies">
                  <Button className="bg-blue-600 hover:bg-blue-700"><Search className="w-4 h-4 mr-2" />Find Companies</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {directHireProjects.map(project => (
                <Link key={project.id} to={`/projects/${project.id}`}>
                  <Card className="hover:shadow-md transition-all hover:border-orange-300 cursor-pointer border-orange-200 bg-orange-50/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Send className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <div className="font-semibold text-gray-900">{project.title}</div>
                              <div className="text-sm text-gray-500 mt-0.5">
                                To: <span className="font-medium text-orange-700">{project.directHireCompanyName}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                project.directHireStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                project.directHireStatus === 'accepted' ? 'bg-green-100 text-green-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {project.directHireStatus === 'pending' ? 'Awaiting Response' :
                                 project.directHireStatus === 'accepted' ? 'Accepted' : 'Declined'}
                              </span>
                              <StatusBadge status={project.status} />
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${project.budget.toLocaleString()}</span>
                            {project.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{project.location}</span>}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0 self-center" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {filter !== 'direct_hire' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map(project => (
              <Link key={project.id} to={`/projects/${project.id}`}>
                <Card className={`hover:shadow-md transition-all cursor-pointer h-full ${
                  project.status === 'awaiting_signatures' ? 'border-purple-200 hover:border-purple-300 bg-purple-50/20' : 'hover:border-blue-200'
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">{project.title}</CardTitle>
                      <StatusBadge status={project.status} />
                    </div>
                    <CardDescription className="line-clamp-2">{project.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {project.status === 'awaiting_signatures' && (
                      <div className="flex items-center gap-2 p-2 bg-purple-100 rounded-lg mb-3 text-xs text-purple-700">
                        <FileSignature className="w-3.5 h-3.5 flex-shrink-0" />
                        Contract signature required — project cannot start until both parties sign
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <DollarSign className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ${project.budget.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="truncate">{project.location || 'Not specified'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Gavel className="w-4 h-4 text-purple-500 flex-shrink-0" />
                        {project.bids.length} bid{project.bids.length !== 1 ? 's' : ''}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        {project.milestones.filter(m => m.status === 'approved').length}/{project.milestones.length} milestones
                      </div>
                    </div>
                    {project.contractorName && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 pt-3 border-t">
                        <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        Contractor: <span className="font-medium text-gray-900">{project.contractorName}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-1 text-xs text-blue-600 mt-3">
                      View details <ArrowRight className="w-3 h-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {filtered.length === 0 && (
            <Card className="text-center py-16">
              <CardContent>
                <FolderKanban className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">No projects found</h3>
                <p className="text-gray-500 text-sm mb-4">Create your first renovation project to get started</p>
                <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />Create Project
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─── Company: Marketplace ──────────────────────────────────────────────────────

function CompanyMarketplace() {
  const { user } = useAuth();
  const { projects, companies, submitBid, respondToDirectHire } = useData();
  const [search, setSearch] = useState('');
  const [acceptDialog, setAcceptDialog] = useState<string | null>(null);
  const [acceptForm, setAcceptForm] = useState({ amount: '', timeline: '' });
  const [bidDialog, setBidDialog] = useState<string | null>(null);
  const [bidForm, setBidForm] = useState({ amount: '', timeline: '', proposal: '' });

  const company = companies.find(c => c.id === user?.companyId);
  // Direct hire requests addressed to this company
  const directHireRequests = projects.filter(p =>
    p.directHireCompanyId === user?.companyId && p.directHireStatus === 'pending'
  );
  // Exclude direct hire projects from the regular marketplace
  const openProjects = projects.filter(p =>
    (p.status === 'open' || p.status === 'bidding') && !p.isDirectHire
  );
  const myBids = projects.flatMap(p => p.bids).filter(b => b.companyId === user?.companyId);
  const filtered = openProjects.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.location.toLowerCase().includes(search.toLowerCase())
  );

  const handleAcceptDirectHire = (e: React.FormEvent, projectId: string) => {
    e.preventDefault();
    if (!acceptForm.amount) { toast.error('Please enter your quote amount'); return; }
    respondToDirectHire(projectId, true, parseFloat(acceptForm.amount), acceptForm.timeline);
    toast.success('Direct hire accepted! Contract is now active.');
    setAcceptDialog(null);
    setAcceptForm({ amount: '', timeline: '' });
  };

  const handleRejectDirectHire = (projectId: string) => {
    respondToDirectHire(projectId, false);
    toast.info('Direct hire request declined.');
  };

  const handleBid = (e: React.FormEvent, projectId: string) => {
    e.preventDefault();
    if (!company) { toast.error('Company profile not found'); return; }
    submitBid({
      projectId,
      companyId: user!.companyId!,
      companyName: company.name,
      amount: parseFloat(bidForm.amount),
      timeline: bidForm.timeline,
      proposal: bidForm.proposal,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      trustGrade: company.trustGrade,
      creditScore: company.creditScore,
    });
    setBidDialog(null);
    setBidForm({ amount: '', timeline: '', proposal: '' });
    toast.success('Bid submitted successfully!');
  };

  const hasAlreadyBid = (projectId: string) => myBids.some(b => b.projectId === projectId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Project Marketplace</h1>
        <p className="text-gray-500 mt-1">Browse open projects and submit your bids</p>
      </div>

      {/* ─── Direct Hire Requests ─── */}
      {directHireRequests.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <h2 className="font-semibold text-gray-900">Direct Hire Requests</h2>
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{directHireRequests.length} pending</span>
          </div>
          <div className="space-y-3">
            {directHireRequests.map(p => (
              <Card key={p.id} className="border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Award className="w-4.5 h-4.5 text-orange-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{p.title}</span>
                          <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full font-medium">Direct Hire</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{p.description}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.location || 'Not specified'}</span>
                          <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />Budget: <strong>${p.budget.toLocaleString()}</strong></span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{p.startDate || 'Flexible start'}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">From: {p.customerName}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleRejectDirectHire(p.id)}
                      >
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => { setAcceptDialog(p.id); setAcceptForm({ amount: String(p.budget), timeline: '' }); }}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />Accept & Quote
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Accept Dialog */}
          {acceptDialog && (() => {
            const proj = directHireRequests.find(p => p.id === acceptDialog);
            if (!proj) return null;
            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Accept Direct Hire</h3>
                  <p className="text-sm text-gray-500 mb-4">Provide your quote for <strong>{proj.title}</strong>. Once accepted, a contract will be activated immediately.</p>
                  <form onSubmit={e => handleAcceptDirectHire(e, acceptDialog)} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Your Quote Amount ($) *</Label>
                      <Input
                        type="number"
                        placeholder="Enter your price"
                        value={acceptForm.amount}
                        onChange={e => setAcceptForm(f => ({ ...f, amount: e.target.value }))}
                        required
                      />
                      <p className="text-xs text-gray-400">Client's budget: ${proj.budget.toLocaleString()}</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Estimated Timeline</Label>
                      <Input
                        placeholder="e.g. 3 months"
                        value={acceptForm.timeline}
                        onChange={e => setAcceptForm(f => ({ ...f, timeline: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-3 pt-1">
                      <Button type="button" variant="outline" onClick={() => setAcceptDialog(null)} className="flex-1">Cancel</Button>
                      <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">Confirm & Activate Contract</Button>
                    </div>
                  </form>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* My Bids Summary */}
      {myBids.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Gavel className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-medium text-blue-900">Your Active Bids</div>
                <div className="text-sm text-blue-700">
                  {myBids.filter(b => b.status === 'pending').length} pending ·
                  {' '}{myBids.filter(b => b.status === 'accepted').length} accepted ·
                  {' '}{myBids.filter(b => b.status === 'rejected').length} rejected
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input className="pl-10" placeholder="Search projects by title or location..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map(project => {
          const alreadyBid = hasAlreadyBid(project.id);
          const myBid = myBids.find(b => b.projectId === project.id);
          return (
            <Card key={project.id} className="hover:shadow-md transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{project.title}</CardTitle>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <MapPin className="w-3 h-3" />{project.location}
                    </div>
                  </div>
                  <StatusBadge status={project.status} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    <span className="text-gray-700">Budget: <strong>${project.budget.toLocaleString()}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-700">Start: {project.startDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Gavel className="w-4 h-4 text-purple-500" />
                    <span className="text-gray-700">{project.bids.length} bid{project.bids.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">{project.endDate || 'TBD'}</span>
                  </div>
                </div>

                {alreadyBid ? (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <div className="text-sm">
                      <span className="font-medium text-green-800">Bid submitted: ${myBid?.amount.toLocaleString()}</span>
                      <span className={`ml-2 text-xs ${myBid?.status === 'accepted' ? 'text-green-600' : myBid?.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}`}>
                        ({myBid?.status})
                      </span>
                    </div>
                  </div>
                ) : (
                  <Dialog open={bidDialog === project.id} onOpenChange={(o) => { if (!o) setBidDialog(null); }}>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => setBidDialog(project.id)}>
                        <Gavel className="w-4 h-4 mr-2" />Submit Bid
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Submit Bid</DialogTitle>
                        <DialogDescription>{project.title}</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={(e) => handleBid(e, project.id)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Bid Amount ($) *</Label>
                            <Input type="number" placeholder="150000" value={bidForm.amount} onChange={e => setBidForm(f => ({ ...f, amount: e.target.value }))} required />
                          </div>
                          <div className="space-y-2">
                            <Label>Timeline *</Label>
                            <Input placeholder="e.g. 4 months" value={bidForm.timeline} onChange={e => setBidForm(f => ({ ...f, timeline: e.target.value }))} required />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Proposal / Cover Letter *</Label>
                          <Textarea placeholder="Describe your approach, team, and why you're the best choice..." rows={4} value={bidForm.proposal} onChange={e => setBidForm(f => ({ ...f, proposal: e.target.value }))} required />
                        </div>
                        {company && (
                          <div className="p-3 bg-blue-50 rounded-lg text-sm">
                            <div className="text-blue-800 font-medium">Your Trust Profile</div>
                            <div className="text-blue-700">Grade {company.trustGrade} · Score {company.creditScore} · {company.trustLevel} Trust</div>
                          </div>
                        )}
                        <div className="flex gap-3">
                          <Button type="button" variant="outline" onClick={() => setBidDialog(null)} className="flex-1">Cancel</Button>
                          <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">Submit Bid</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card className="text-center py-16">
          <CardContent>
            <Search className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-500 text-sm">Try adjusting your search or check back later</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Reviewer/Admin: All Projects ─────────────────────────────────────────────

function AllProjectsView() {
  const { projects } = useData();
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === (filter as any));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Projects</h1>
        <p className="text-gray-500 mt-1">Platform-wide project overview</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: `All (${projects.length})` },
          { key: 'open', label: `Open (${projects.filter(p => p.status === 'open').length})` },
          { key: 'bidding', label: `Bidding (${projects.filter(p => p.status === 'bidding').length})` },
          { key: 'awaiting_signatures', label: `Awaiting Signatures (${projects.filter(p => p.status === 'awaiting_signatures').length})` },
          { key: 'active', label: `Active (${projects.filter(p => p.status === 'active').length})` },
          { key: 'disputed', label: `Disputed (${projects.filter(p => p.status === 'disputed').length})` },
          { key: 'completed', label: `Completed (${projects.filter(p => p.status === 'completed').length})` },
        ].map(({ key, label }) => (
          <Button key={key} variant={filter === key ? 'default' : 'outline'} size="sm" onClick={() => setFilter(key)}
            className={filter === key ? 'bg-blue-600 hover:bg-blue-700' : ''}>
            {label}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(project => (
          <Link key={project.id} to={`/projects/${project.id}`}>
            <Card className="hover:shadow-md transition-all cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <FolderKanban className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-gray-900">{project.title}</div>
                        <div className="text-sm text-gray-500">
                          Customer: {project.customerName} · Budget: ${project.budget.toLocaleString()}
                          {project.contractorName && ` · Contractor: ${project.contractorName}`}
                        </div>
                      </div>
                      <StatusBadge status={project.status} />
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>{project.bids.length} bids</span>
                      <span>{project.milestones.length} milestones</span>
                      <span>{project.disputes.length} disputes</span>
                      {project.status === 'disputed' && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                      {project.status === 'awaiting_signatures' && <FileSignature className="w-3.5 h-3.5 text-purple-500" />}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0 self-center" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Projects() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8">
        {user?.role === 'customer' && <CustomerProjects />}
        {user?.role === 'company_user' && <CompanyMarketplace />}
        {(user?.role === 'reviewer' || user?.role === 'admin') && <AllProjectsView />}
      </main>
    </div>
  );
}
