import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useData } from '../contexts/data-context';
import { useAuth } from '../contexts/auth-context';
import { Sidebar } from '../components/sidebar';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  ArrowLeft, Shield, Star, CheckCircle, XCircle, MapPin, Phone, Mail,
  Users, Calendar, Award, Leaf, FileCheck, Building2, TrendingUp,
  MessageSquare, ChevronDown, ChevronUp, Send, ExternalLink
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { toast } from 'sonner';

function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const sizes = { sm: 'w-3.5 h-3.5', md: 'w-5 h-5', lg: 'w-6 h-6' };
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} className={`${sizes[size]} ${i <= full ? 'text-yellow-400' : i === full + 1 && half ? 'text-yellow-300' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function CircularTrustGauge({ score, grade }: { score: number; grade: string }) {
  const maxScore = 4000;
  const pct = Math.min(score / maxScore, 1);
  const radius = 80;
  const circ = 2 * Math.PI * radius;
  const strokeDash = pct * circ * 0.75;
  const strokeOffset = circ * 0.125;

  const gradeColors: Record<string, string> = {
    A: '#16a34a', B: '#2563eb', C: '#d97706', D: '#dc2626',
  };
  const color = gradeColors[grade] || '#6b7280';

  return (
    <div className="relative w-48 h-48 mx-auto">
      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
        <circle cx="100" cy="100" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="16"
          strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeDashoffset={-strokeOffset} strokeLinecap="round" />
        <circle cx="100" cy="100" r={radius} fill="none" stroke={color} strokeWidth="16"
          strokeDasharray={`${strokeDash} ${circ - strokeDash}`} strokeDashoffset={-strokeOffset}
          strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold text-gray-900">{score.toLocaleString()}</div>
        <div className="text-sm text-gray-500">/ {maxScore.toLocaleString()}</div>
        <div className="mt-1 px-3 py-0.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: color }}>
          Grade {grade}
        </div>
      </div>
    </div>
  );
}

function RatingBar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total === 0 ? 0 : (value / total) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-4 flex-shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
      </div>
      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div className="h-full bg-green-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm text-gray-500 w-10 text-right flex-shrink-0">{Math.round(pct)}%</span>
    </div>
  );
}

function ReviewCard({ review }: { review: any }) {
  const [expanded, setExpanded] = useState(false);
  const [replyExpanded, setReplyExpanded] = useState(false);
  const maxLen = 200;
  const isLong = review.comment.length > maxLen;

  return (
    <div className="border-b border-gray-100 pb-5 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-200 to-blue-300 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-blue-700">{review.customerName.charAt(0)}</span>
          </div>
          <div>
            <div className="font-medium text-gray-900">{review.customerName}</div>
            <StarRating rating={review.rating} size="sm" />
          </div>
        </div>
        <div className="text-sm text-gray-400 flex-shrink-0">{review.createdAt}</div>
      </div>

      <p className="text-sm text-gray-700 mt-3 leading-relaxed">
        {isLong && !expanded ? review.comment.slice(0, maxLen) + '...' : review.comment}
        {isLong && (
          <button onClick={() => setExpanded(!expanded)} className="ml-1 text-blue-600 hover:underline text-sm font-medium">
            {expanded ? 'Show less' : '...See more'}
          </button>
        )}
      </p>

      {review.categories && (
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(review.categories).map(([k, v]) => (
            <span key={k} className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded border border-gray-100 capitalize">
              {k}: {v as number}/5
            </span>
          ))}
        </div>
      )}

      {review.companyReply && (
        <div className="mt-3 bg-gray-50 border border-gray-100 rounded-lg p-3">
          <button onClick={() => setReplyExpanded(!replyExpanded)} className="flex items-center gap-2 w-full text-left">
            <MessageSquare className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Company Reply</span>
            {replyExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-auto" />}
          </button>
          {replyExpanded && (
            <p className="text-sm text-gray-600 mt-2">{review.companyReply}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { companies, projects, submitDirectHire } = useData();
  const { user } = useAuth();

  // Dialog states
  const [contactDialog, setContactDialog] = useState(false);
  const [hireDialog, setHireDialog] = useState(false);
  const [hireMode, setHireMode] = useState<'new' | 'existing'>('new');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [hireForm, setHireForm] = useState({
    title: '', description: '', location: '', budget: '', startDate: '', endDate: '',
  });

  const company = companies.find(c => c.id === id);
  const isCustomer = user?.role === 'customer';
  // All projects without an assigned contractor (pre-start states): open, bidding (no contractor), cancelled
  // Excludes: active, awaiting_signatures, completed, disputed (contractor already selected)
  const myLinkableProjects = projects.filter(p =>
    p.customerId === user?.id &&
    !p.contractorId &&
    !['active', 'awaiting_signatures', 'completed', 'disputed'].includes(p.status)
  );

  const handleDirectHireSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !company) return;
    if (hireMode === 'existing') {
      if (!selectedProjectId) { toast.error('Please select a project'); return; }
      submitDirectHire({ existingProjectId: selectedProjectId, companyId: company.id, companyName: company.name });
      toast.success(`Direct hire request sent to ${company.name}!`);
      setHireDialog(false);
    } else {
      if (!hireForm.title || !hireForm.budget) { toast.error('Please fill in required fields'); return; }
      submitDirectHire({
        projectData: {
          title: hireForm.title,
          description: hireForm.description,
          customerId: user.id,
          customerName: user.name,
          location: hireForm.location,
          budget: parseFloat(hireForm.budget),
          startDate: hireForm.startDate,
          endDate: hireForm.endDate,
          status: 'open',
        },
        companyId: company.id,
        companyName: company.name,
      });
      toast.success(`Direct hire request sent to ${company.name}!`);
      setHireDialog(false);
      setHireForm({ title: '', description: '', location: '', budget: '', startDate: '', endDate: '' });
    }
  };

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <main className="lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8">
          <div className="text-center py-20">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Company not found</h2>
            <Button onClick={() => navigate('/companies')} variant="outline">Back to Companies</Button>
          </div>
        </main>
      </div>
    );
  }

  const trustLevelColor = company.trustGrade === 'A' ? 'text-green-600' :
    company.trustGrade === 'B' ? 'text-blue-600' :
    company.trustGrade === 'C' ? 'text-yellow-600' : 'text-red-600';

  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: (company.reviews || []).filter(r => Math.round(r.rating) === star).length,
  }));

  const getRatingLabel = (r: number) => {
    if (r >= 4.8) return 'Exceptional';
    if (r >= 4.5) return 'Excellent';
    if (r >= 4.0) return 'Great';
    if (r >= 3.5) return 'Good';
    return 'Fair';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8">
        <Button variant="ghost" onClick={() => navigate('/companies')} className="gap-2 mb-6 -ml-2">
          <ArrowLeft className="w-4 h-4" />Back to Companies
        </Button>

        {/* ─── HERO: Trust Score First ─── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-6">
          {/* Top banner with Trust Score */}
          <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 px-6 pt-6 pb-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
              {/* Avatar + Name */}
              <div className="flex items-start gap-4 flex-1">
                <div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {company.avatar ? (
                    <img src={company.avatar} alt={company.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-9 h-9 text-white" />
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{company.name}</h1>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`font-semibold text-sm text-yellow-300`}>
                      {getRatingLabel(company.averageRating)} {company.averageRating.toFixed(1)}
                    </span>
                    <StarRating rating={company.averageRating} size="sm" />
                    <span className="text-blue-200 text-sm">({company.reviewCount} reviews)</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {company.licenceStatus === 'valid' && (
                      <Badge className="bg-white/20 text-white border border-white/30 gap-1">
                        <CheckCircle className="w-3 h-3" />Licensed
                      </Badge>
                    )}
                    {company.oshCertified && (
                      <Badge className="bg-white/20 text-white border border-white/30 gap-1">
                        <FileCheck className="w-3 h-3" />OSH Certified
                      </Badge>
                    )}
                    {company.trustGrade === 'A' && (
                      <Badge className="bg-yellow-400/20 text-yellow-200 border border-yellow-300/30 gap-1">
                        <Award className="w-3 h-3" />Top Rated Pro
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Trust Score Highlight */}
              <div className="bg-white/10 border border-white/20 rounded-2xl px-8 py-5 text-center backdrop-blur-sm flex-shrink-0">
                <div className="text-blue-200 text-xs font-medium mb-1 flex items-center gap-1 justify-center">
                  <Shield className="w-3 h-3" />DecoFinance Trust Score
                </div>
                <div className="text-5xl font-bold text-white">{company.creditScore.toLocaleString()}</div>
                <div className="text-blue-200 text-sm mt-1">Grade {company.trustGrade} · {company.trustLevel}</div>
                <div className="mt-2 text-xs text-blue-300">Updated {company.lastScoreUpdate}</div>
              </div>
            </div>
          </div>

          {/* Location & Quick Stats below banner */}
          <div className="px-6 py-4 flex items-center gap-6 flex-wrap border-b border-gray-100">
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-gray-400" />
              {company.serviceArea || company.address}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Users className="w-4 h-4 text-gray-400" />
              {company.employees} employees
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400" />
              {new Date().getFullYear() - new Date(company.established).getFullYear()} years in business
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              {company.projectsCompleted || 0} projects completed
            </div>
          </div>

          {/* Specialties */}
          {company.specialties && (
            <div className="px-6 py-3 flex flex-wrap gap-2">
              {company.specialties.map(s => (
                <span key={s} className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100">{s}</span>
              ))}
            </div>
          )}

          {/* ─── Action Buttons ─── */}
          <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap gap-3">
            {isCustomer && (
              <Button
                className="bg-blue-600 hover:bg-blue-700 gap-2"
                onClick={() => setHireDialog(true)}
              >
                <Send className="w-4 h-4" />Direct Hire Request
              </Button>
            )}
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setContactDialog(true)}
            >
              <MessageSquare className="w-4 h-4" />Contact / Message
            </Button>
          </div>
        </div>

        {/* ─── CONTACT DIALOG ─── */}
        <Dialog open={contactDialog} onOpenChange={setContactDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />Contact {company.name}
              </DialogTitle>
              <DialogDescription>Reach out directly using the contact details below. The platform does not manage messaging.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {/* Email */}
              <a href={`mailto:${company.contactEmail}`} className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 mb-0.5">Email</div>
                  <div className="text-sm font-medium text-gray-900 truncate">{company.contactEmail}</div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
              </a>
              {/* Phone */}
              <a href={`tel:${company.contactPhone}`} className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all group">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-green-200">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 mb-0.5">Phone</div>
                  <div className="text-sm font-medium text-gray-900">{company.contactPhone}</div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-green-500 flex-shrink-0" />
              </a>
              {/* WhatsApp */}
              {company.whatsapp && (
                <a
                  href={`https://wa.me/${company.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all group"
                >
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200">
                    {/* WhatsApp icon */}
                    <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 mb-0.5">WhatsApp</div>
                    <div className="text-sm font-medium text-gray-900">{company.contactPhone}</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 flex-shrink-0" />
                </a>
              )}
              <p className="text-xs text-gray-400 text-center pt-1">
                DecoFinance does not operate its own messaging system. Please contact the company directly.
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {/* ─── DIRECT HIRE DIALOG ─── */}
        <Dialog open={hireDialog} onOpenChange={setHireDialog}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" />Direct Hire Request — {company.name}
              </DialogTitle>
              <DialogDescription>
                Skip the open bidding — hire this company directly. Provide your project details or link an existing project.
              </DialogDescription>
            </DialogHeader>

            {/* Mode toggle */}
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setHireMode('new')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border transition-all ${hireMode === 'new' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
              >
                Create New Project
              </button>
              <button
                type="button"
                onClick={() => setHireMode('existing')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border transition-all ${hireMode === 'existing' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
              >
                Link Existing Project
              </button>
            </div>

            <form onSubmit={handleDirectHireSubmit} className="space-y-4 mt-2">
              {hireMode === 'new' ? (
                <>
                  <div className="space-y-2">
                    <Label>Project Title *</Label>
                    <Input
                      placeholder="e.g. Kitchen Renovation"
                      value={hireForm.title}
                      onChange={e => setHireForm(f => ({ ...f, title: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Describe the scope of work..."
                      value={hireForm.description}
                      onChange={e => setHireForm(f => ({ ...f, description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        placeholder="City, State"
                        value={hireForm.location}
                        onChange={e => setHireForm(f => ({ ...f, location: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Budget ($) *</Label>
                      <Input
                        type="number"
                        placeholder="50000"
                        value={hireForm.budget}
                        onChange={e => setHireForm(f => ({ ...f, budget: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input type="date" value={hireForm.startDate} onChange={e => setHireForm(f => ({ ...f, startDate: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input type="date" value={hireForm.endDate} onChange={e => setHireForm(f => ({ ...f, endDate: e.target.value }))} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label>Select Your Project *</Label>
                  <p className="text-xs text-gray-500">Projects without a selected contractor (open, bidding, cancelled)</p>
                  {myLinkableProjects.length === 0 ? (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                      <p className="text-sm text-gray-500">No linkable projects available. Create a new project instead.</p>
                      <button type="button" onClick={() => setHireMode('new')} className="mt-2 text-sm text-blue-600 hover:underline">Switch to New Project</button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {myLinkableProjects.map(p => (
                        <label key={p.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedProjectId === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                          <input
                            type="radio"
                            name="existingProject"
                            value={p.id}
                            checked={selectedProjectId === p.id}
                            onChange={() => setSelectedProjectId(p.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-900">{p.title}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                p.status === 'open' ? 'bg-gray-100 text-gray-600' :
                                p.status === 'bidding' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-500'
                              }`}>{p.status}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">${p.budget.toLocaleString()} · {p.location || 'No location'} · {p.bids.length} bid{p.bids.length !== 1 ? 's' : ''}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <strong>How it works:</strong> The company will review your request and provide a quote. Once they accept, a contract is activated with platform-managed milestones.
              </div>

              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" onClick={() => setHireDialog(false)} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2">
                  <Send className="w-4 h-4" />Send Hire Request
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ─── TABS ─── */}
        <Tabs defaultValue="trust">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
            <TabsTrigger value="trust" className="gap-1.5"><Shield className="w-3.5 h-3.5" />Trust Score</TabsTrigger>
            <TabsTrigger value="about" className="gap-1.5"><Building2 className="w-3.5 h-3.5" />About & Credentials</TabsTrigger>
            <TabsTrigger value="reviews" className="gap-1.5"><Star className="w-3.5 h-3.5" />Reviews ({company.reviewCount})</TabsTrigger>
            <TabsTrigger value="esg" className="gap-1.5"><Leaf className="w-3.5 h-3.5" />ESG</TabsTrigger>
          </TabsList>

          {/* ─── TRUST SCORE TAB ─── */}
          <TabsContent value="trust" className="space-y-5">
            {/* Score Gauge + History */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" />Trust Score Overview
                  </CardTitle>
                  <CardDescription>DecoFinance proprietary trust assessment</CardDescription>
                </CardHeader>
                <CardContent>
                  <CircularTrustGauge score={company.creditScore} grade={company.trustGrade} />
                  <div className="mt-4 text-center">
                    <span className={`text-lg font-bold ${trustLevelColor}`}>{company.trustLevel} Trust Level</span>
                    <p className="text-sm text-gray-500 mt-1">Based on {company.scoreFactors.length} evaluation factors</p>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
                    <strong>What does this mean?</strong> A Trust Score of {company.creditScore.toLocaleString()} places this company in the top tier of verified renovation contractors on the DecoFinance platform.
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Score History</CardTitle>
                  <CardDescription>7-month trend</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={company.scoreHistory}>
                      <defs>
                        <linearGradient id={`trustGrad-${company.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop key="stop-top" offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                          <stop key="stop-bottom" offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} width={50} />
                      <Tooltip formatter={(v: number) => [v.toLocaleString(), 'Trust Score']} />
                      <Area type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2.5} fill={`url(#trustGrad-${company.id})`} dot={{ r: 3, fill: '#2563eb' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Score Factors */}
            <Card>
              <CardHeader>
                <CardTitle>Score Factor Analysis</CardTitle>
                <CardDescription>Breakdown of all trust evaluation dimensions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {company.scoreFactors.map(factor => {
                    const pct = Math.round((factor.score / factor.maxScore) * 100);
                    const barColor = factor.status === 'good' ? 'bg-green-500' : factor.status === 'fair' ? 'bg-yellow-500' : 'bg-red-500';
                    const badgeColor = factor.status === 'good' ? 'bg-green-100 text-green-700' : factor.status === 'fair' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
                    return (
                      <div key={factor.name}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-800">{factor.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${badgeColor}`}>{factor.status}</span>
                          </div>
                          <div className="text-sm font-semibold text-gray-900">{factor.score}<span className="text-gray-400 font-normal">/{factor.maxScore}</span></div>
                        </div>
                        <Progress value={pct} className="h-2" />
                        <p className="text-xs text-gray-500 mt-1">{factor.description}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── ABOUT & CREDENTIALS TAB ─── */}
          <TabsContent value="about" className="space-y-5">
            {/* Contact */}
            <Card>
              <CardHeader><CardTitle>Contact & Overview</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-gray-500">Email</div>
                        <div className="text-sm font-medium text-gray-900">{company.contactEmail}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-gray-500">Phone</div>
                        <div className="text-sm font-medium text-gray-900">{company.contactPhone}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-gray-500">Address</div>
                        <div className="text-sm font-medium text-gray-900">{company.address}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-gray-500">Registration</div>
                        <div className="text-sm font-medium text-gray-900">{company.registrationNo}</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Users className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-gray-500">Employees</div>
                        <div className="text-sm font-medium text-gray-900">{company.employees}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-gray-500">Established</div>
                        <div className="text-sm font-medium text-gray-900">{company.established}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <TrendingUp className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-gray-500">Projects Completed</div>
                        <div className="text-sm font-medium text-gray-900">{company.projectsCompleted || 0}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Licence & Compliance */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Shield className="w-4 h-4 text-blue-600" />Licence & Compliance</CardTitle>
                    <CardDescription>Platform-verified credentials</CardDescription>
                  </div>
                  <Badge className={company.licenceStatus === 'valid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                    {company.licenceStatus === 'valid' ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                    {company.licenceStatus}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Licence Number', value: company.licenceNo },
                    { label: 'Licence Expiry', value: company.licenceExpiry },
                    { label: 'Insurance Provider', value: company.insuranceProvider },
                    { label: 'Coverage Amount', value: `$${company.insuranceAmount.toLocaleString()}` },
                    { label: 'Insurance Expiry', value: company.insuranceExpiry },
                    { label: 'OSH Certified', value: company.oshCertified ? 'Yes (Certified)' : 'No' },
                    { label: 'OSH Cert. Expiry', value: company.oshCertExpiry },
                    { label: 'Incident Rate', value: `${company.incidentRate} per 100 workers` },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">{label}</div>
                      <div className="text-sm font-semibold text-gray-900">{value}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { label: 'Trade Licence', icon: FileCheck, verified: company.licenceStatus === 'valid' },
                    { label: 'Insurance Certificate', icon: Shield, verified: true },
                    { label: 'OSH Certification', icon: CheckCircle, verified: company.oshCertified },
                    { label: 'Background Check', icon: CheckCircle, verified: true },
                  ].map(({ label, icon: Icon, verified }) => (
                    <div key={label} className={`flex items-center gap-3 p-3 rounded-lg border ${verified ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                      <Icon className={`w-4 h-4 flex-shrink-0 ${verified ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className="text-sm font-medium text-gray-800">{label}</span>
                      {verified ? (
                        <span className="ml-auto text-xs text-green-600 font-medium">Verified ✓</span>
                      ) : (
                        <span className="ml-auto text-xs text-gray-400">Pending</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── REVIEWS TAB ─── */}
          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle>Customer Reviews</CardTitle>
                    <CardDescription>Verified reviews from DecoFinance project clients</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {company.reviews.length === 0 ? (
                  <div className="text-center py-10">
                    <Star className="w-12 h-12 mx-auto text-gray-200 mb-3" />
                    <p className="text-gray-500">No reviews yet</p>
                  </div>
                ) : (
                  <div className="flex flex-col lg:flex-row gap-8">
                    {/* Rating Summary */}
                    <div className="lg:w-64 flex-shrink-0">
                      <div className="text-center mb-4">
                        <div className={`text-4xl font-bold ${company.averageRating >= 4.5 ? 'text-green-600' : company.averageRating >= 4 ? 'text-blue-600' : 'text-gray-700'}`}>
                          {company.averageRating.toFixed(1)}
                        </div>
                        <div className={`font-semibold mt-0.5 ${company.averageRating >= 4.5 ? 'text-green-600' : 'text-blue-600'}`}>
                          {company.averageRating >= 4.8 ? 'Exceptional' : company.averageRating >= 4.5 ? 'Excellent' : company.averageRating >= 4 ? 'Great' : 'Good'}
                        </div>
                        <StarRating rating={company.averageRating} size="md" />
                        <div className="text-sm text-gray-500 mt-1">{company.reviewCount} reviews</div>
                      </div>

                      <div className="space-y-2">
                        {ratingDistribution.map(({ star, count }) => (
                          <RatingBar key={star} label={`${star}`} value={count} total={company.reviewCount} />
                        ))}
                      </div>
                    </div>

                    {/* Review List */}
                    <div className="flex-1 space-y-5">
                      {company.reviews.map(review => (
                        <ReviewCard key={review.id} review={review} />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── ESG TAB ─── */}
          <TabsContent value="esg">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Leaf className="w-4 h-4 text-green-600" />ESG Performance</CardTitle>
                    <CardDescription>Environmental, Social & Governance rating</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full">
                    <Leaf className="w-4 h-4" />
                    <span className="font-bold">ESG: {company.esgRating}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="text-xs text-gray-500 mb-1">ESG Rating</div>
                    <div className="text-2xl font-bold text-green-700">{company.esgRating}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="text-xs text-gray-500 mb-1">Carbon Footprint</div>
                    <div className="text-2xl font-bold text-gray-900">{company.carbonFootprint}<span className="text-sm font-normal text-gray-500"> t CO₂e/yr</span></div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-700 mb-3">Sustainable Practices</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {company.sustainablePractices.map(p => (
                      <div key={p} className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="text-sm text-green-800">{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}