import { useState, useRef } from 'react';
import { useAuth } from '../contexts/auth-context';
import { useData } from '../contexts/data-context';
import { Sidebar } from '../components/sidebar';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Building2, Shield, FileCheck, Leaf, Award, Edit3, Save, X, CheckCircle,
  XCircle, AlertCircle, Download, Eye, ExternalLink, Camera, Star, MessageSquare,
  ChevronDown, ChevronUp, User
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router';

function StatusBadge({ status }: { status: string }) {
  if (status === 'valid') return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Valid</Badge>;
  if (status === 'expired') return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-700"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} className={`${iconSize} ${i <= full ? 'text-yellow-400' : i === full + 1 && half ? 'text-yellow-300' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: any }) {
  const [replyOpen, setReplyOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 pb-5 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-blue-700">{review.customerName.charAt(0)}</span>
          </div>
          <div>
            <div className="font-medium text-gray-900">{review.customerName}</div>
            <StarRating rating={review.rating} size="sm" />
          </div>
        </div>
        <span className="text-sm text-gray-400 flex-shrink-0">{review.createdAt}</span>
      </div>
      {review.projectTitle && (
        <div className="text-xs text-blue-600 mt-2">Project: {review.projectTitle}</div>
      )}
      <p className="text-sm text-gray-700 mt-2 leading-relaxed">{review.comment}</p>
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
        <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
          <button onClick={() => setReplyOpen(!replyOpen)} className="flex items-center gap-2 w-full text-left">
            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700">Your Reply</span>
            {replyOpen ? <ChevronUp className="w-3 h-3 text-blue-400 ml-auto" /> : <ChevronDown className="w-3 h-3 text-blue-400 ml-auto" />}
          </button>
          {replyOpen && <p className="text-sm text-blue-700 mt-2">{review.companyReply}</p>}
        </div>
      )}
    </div>
  );
}

// Company profile for company_user
function CompanyProfilePage() {
  const { user } = useAuth();
  const { companies, getCompany, updateCompanyAvatar } = useData();
  const [editing, setEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const company = getCompany(user?.companyId || 'c1') || companies[0];

  if (!company) return <div className="text-center py-12 text-gray-500">No company profile found.</div>;

  const handleSave = () => {
    setEditing(false);
    toast.success('Company profile updated successfully');
  };

  const handleDownloadReport = () => {
    toast.success('Credit report download started (PDF)');
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      updateCompanyAvatar(company.id, dataUrl);
      toast.success('Company logo updated successfully');
    };
    reader.readAsDataURL(file);
  };

  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: (company.reviews || []).filter(r => Math.round(r.rating) === star).length,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Profile</h1>
          <p className="text-gray-500 mt-1">Manage your company information and compliance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadReport} className="gap-2">
            <Download className="w-4 h-4" /> Download Report
          </Button>
          {editing ? (
            <>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 gap-2"><Save className="w-4 h-4" />Save</Button>
              <Button variant="outline" onClick={() => setEditing(false)}><X className="w-4 h-4" /></Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)} className="gap-2"><Edit3 className="w-4 h-4" />Edit</Button>
          )}
        </div>
      </div>

      {/* Trust Score Banner */}
      <Card className="bg-gradient-to-r from-blue-600 to-blue-700 border-0 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-5">
              {/* Avatar with upload */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center overflow-hidden">
                  {company.avatar ? (
                    <img src={company.avatar} alt={company.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-9 h-9 text-white/70" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5 text-blue-600" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
              <div>
                <div className="text-blue-200 text-xs mb-0.5">Company</div>
                <div className="text-xl font-bold">{company.name}</div>
                <div className="text-blue-200 text-sm mt-0.5 flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 fill-yellow-300 text-yellow-300" />
                  {company.averageRating.toFixed(1)} · {company.reviewCount} reviews
                </div>
              </div>
            </div>
            <div>
              <div className="text-blue-200 text-sm mb-1">Trust Score</div>
              <div className="text-4xl font-bold">{company.creditScore}</div>
              <div className="text-blue-200 mt-1">Grade {company.trustGrade} · {company.trustLevel} Trust Level</div>
            </div>
            <div className="text-right">
              <div className="text-blue-200 text-sm mb-1">Last Updated</div>
              <div className="font-semibold">{company.lastScoreUpdate}</div>
              <Link to="/credit-score">
                <Button className="mt-2 bg-white text-blue-600 hover:bg-blue-50 text-sm gap-1">
                  <Eye className="w-4 h-4" />View Full Report
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="general" className="gap-1.5"><Building2 className="w-3.5 h-3.5" />General</TabsTrigger>
          <TabsTrigger value="compliance" className="gap-1.5"><Shield className="w-3.5 h-3.5" />Compliance</TabsTrigger>
          <TabsTrigger value="osh" className="gap-1.5"><FileCheck className="w-3.5 h-3.5" />OSH</TabsTrigger>
          <TabsTrigger value="esg" className="gap-1.5"><Leaf className="w-3.5 h-3.5" />ESG</TabsTrigger>
          <TabsTrigger value="reviews" className="gap-1.5">
            <Star className="w-3.5 h-3.5" />Reviews
            {company.reviewCount > 0 && (
              <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{company.reviewCount}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* General Info */}
        <TabsContent value="general">
          <Card>
            <CardHeader><CardTitle>General Information</CardTitle><CardDescription>Legal and contact details</CardDescription></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { label: 'Company Name', value: company.name, id: 'name' },
                  { label: 'Registration Number', value: company.registrationNo, id: 'reg' },
                  { label: 'Contact Email', value: company.contactEmail, id: 'email' },
                  { label: 'Contact Phone', value: company.contactPhone, id: 'phone' },
                  { label: 'Number of Employees', value: company.employees.toString(), id: 'emp' },
                  { label: 'Established', value: company.established, id: 'est' },
                ].map(({ label, value, id }) => (
                  <div key={id} className="space-y-2">
                    <Label htmlFor={id}>{label}</Label>
                    {editing ? <Input id={id} defaultValue={value} /> : <div className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded-lg">{value}</div>}
                  </div>
                ))}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  {editing ? <Input id="address" defaultValue={company.address} /> : <div className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded-lg">{company.address}</div>}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance */}
        <TabsContent value="compliance">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div><CardTitle>Licence & Registration</CardTitle><CardDescription>Trade licence information</CardDescription></div>
                  <StatusBadge status={company.licenceStatus} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: 'Licence Number', value: company.licenceNo },
                    { label: 'Expiry Date', value: company.licenceExpiry },
                    { label: 'Status', value: company.licenceStatus },
                  ].map(({ label, value }) => (
                    <div key={label} className="space-y-2">
                      <Label>{label}</Label>
                      {editing ? <Input defaultValue={value} /> : <div className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded-lg">{value}</div>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div><CardTitle>Insurance</CardTitle><CardDescription>Liability and coverage details</CardDescription></div>
                  <StatusBadge status="valid" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: 'Insurance Provider', value: company.insuranceProvider },
                    { label: 'Coverage Amount', value: `$${company.insuranceAmount.toLocaleString()}` },
                    { label: 'Policy Expiry', value: company.insuranceExpiry },
                  ].map(({ label, value }) => (
                    <div key={label} className="space-y-2">
                      <Label>{label}</Label>
                      {editing ? <Input defaultValue={value} /> : <div className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded-lg">{value}</div>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* OSH */}
        <TabsContent value="osh">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div><CardTitle>Occupational Safety & Health</CardTitle><CardDescription>OSH compliance and safety records</CardDescription></div>
                <Badge className={company.oshCertified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                  {company.oshCertified ? <><CheckCircle className="w-3 h-3 mr-1" />Certified</> : <><XCircle className="w-3 h-3 mr-1" />Not Certified</>}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {[
                  { label: 'OSH Certified', value: company.oshCertified ? 'Yes' : 'No' },
                  { label: 'Certificate Expiry', value: company.oshCertExpiry },
                  { label: 'Incident Rate (per 100)', value: company.incidentRate.toString() },
                ].map(({ label, value }) => (
                  <div key={label} className="space-y-2">
                    <Label>{label}</Label>
                    {editing ? <Input defaultValue={value} /> : <div className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded-lg">{value}</div>}
                  </div>
                ))}
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-green-800">Safety Record</div>
                    <div className="text-sm text-green-700 mt-1">
                      Incident rate of {company.incidentRate} per 100 workers — well below industry average of 3.2. Last safety audit passed on schedule.
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ESG */}
        <TabsContent value="esg">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div><CardTitle>Environmental, Social & Governance</CardTitle><CardDescription>Sustainability and ESG performance</CardDescription></div>
                <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-full">
                  <Leaf className="w-4 h-4" />
                  <span className="font-semibold">ESG Rating: {company.esgRating}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <Label>ESG Rating</Label>
                  {editing ? (
                    <Select defaultValue={company.esgRating}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['AAA', 'AA', 'A', 'A-', 'BBB', 'BB', 'B'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : <div className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded-lg">{company.esgRating}</div>}
                </div>
                <div className="space-y-2">
                  <Label>Carbon Footprint (tonnes CO₂e/year)</Label>
                  {editing ? <Input defaultValue={company.carbonFootprint.toString()} type="number" /> : <div className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded-lg">{company.carbonFootprint}</div>}
                </div>
              </div>
              <div className="space-y-3">
                <Label>Sustainable Practices</Label>
                <div className="grid grid-cols-2 gap-2">
                  {company.sustainablePractices.map(practice => (
                    <div key={practice} className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <Leaf className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span className="text-sm text-green-800">{practice}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />Customer Reviews
              </CardTitle>
              <CardDescription>Reviews from your project clients on DecoFinance</CardDescription>
            </CardHeader>
            <CardContent>
              {(company.reviews || []).length === 0 ? (
                <div className="text-center py-12">
                  <User className="w-12 h-12 mx-auto text-gray-200 mb-3" />
                  <h3 className="font-medium text-gray-700 mb-1">No reviews yet</h3>
                  <p className="text-sm text-gray-500">Reviews will appear here after clients rate completed projects</p>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Rating Summary */}
                  <div className="lg:w-56 flex-shrink-0">
                    <div className="text-center p-4 bg-gray-50 rounded-xl mb-4">
                      <div className={`text-4xl font-bold ${(company.averageRating || 0) >= 4.5 ? 'text-green-600' : 'text-blue-600'}`}>
                        {(company.averageRating || 0).toFixed(1)}
                      </div>
                      <StarRating rating={company.averageRating} size="md" />
                      <div className="text-sm text-gray-500 mt-1">{company.reviewCount || 0} reviews</div>
                    </div>
                    <div className="space-y-2">
                      {ratingDistribution.map(({ star, count }) => (
                        <div key={star} className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500 w-3">{star}</span>
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${(company.reviewCount || 0) === 0 ? 0 : (count / (company.reviewCount || 1)) * 100}%` }} />
                          </div>
                          <span className="text-gray-500 w-8 text-right">{Math.round((company.reviewCount || 0) === 0 ? 0 : (count / (company.reviewCount || 1)) * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Reviews */}
                  <div className="flex-1 space-y-5">
                    {(company.reviews || []).map(review => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Company list for reviewer/admin
function CompanyListPage() {
  const { companies } = useData();
  const gradeColor = (grade: string) => {
    if (grade === 'A') return 'bg-green-100 text-green-700';
    if (grade === 'B') return 'bg-blue-100 text-blue-700';
    if (grade === 'C') return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Company Reports</h1>
        <p className="text-gray-500 mt-1">Review company profiles, trust scores, and compliance status</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {companies.map(company => (
          <Card key={company.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {company.avatar ? (
                      <img src={company.avatar} alt={company.name} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{company.name}</h3>
                    <p className="text-sm text-gray-500">{company.registrationNo} · Est. {company.established}</p>
                    <p className="text-sm text-gray-500">{company.employees} employees · {company.address.split(',').slice(-2).join(',').trim()}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm text-gray-600">{company.averageRating.toFixed(1)}</span>
                      <span className="text-xs text-gray-400">({company.reviewCount} reviews)</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{company.creditScore}</div>
                    <div className="text-xs text-gray-500">Trust Score</div>
                  </div>
                  <Badge className={`text-sm px-3 py-1 ${gradeColor(company.trustGrade)}`}>Grade {company.trustGrade}</Badge>
                  <StatusBadge status={company.licenceStatus} />
                  <Link to={`/companies/${company.id}`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <ExternalLink className="w-4 h-4" />View Report
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.success('PDF download started')}>
                    <Download className="w-4 h-4" />PDF
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Insurance', value: `$${(company.insuranceAmount / 1000000).toFixed(1)}M`, sub: company.insuranceExpiry },
                  { label: 'OSH', value: company.oshCertified ? 'Certified' : 'Pending', sub: company.oshCertExpiry },
                  { label: 'ESG Rating', value: company.esgRating, sub: `${company.carbonFootprint}t CO₂` },
                  { label: 'Licence', value: company.licenceNo, sub: company.licenceExpiry },
                ].map(({ label, value, sub }) => (
                  <div key={label} className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500">{label}</div>
                    <div className="font-semibold text-gray-900 text-sm mt-0.5">{value}</div>
                    <div className="text-xs text-gray-500">{sub}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8">
        {user?.role === 'company_user' ? <CompanyProfilePage /> : <CompanyListPage />}
      </main>
    </div>
  );
}