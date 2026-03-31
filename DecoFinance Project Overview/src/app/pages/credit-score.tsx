import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/auth-context';
import { useData } from '../contexts/data-context';
import { Sidebar } from '../components/sidebar';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  ArrowLeft, ChevronDown, ChevronUp, FileBarChart, Download, TrendingUp, Award,
  CheckCircle, AlertCircle, XCircle, Shield, RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { toast } from 'sonner';

const SCORE_RANGES = [
  { level: 'A', range: '3526 - 4000', min: 3526, color: '#15803d', bgColor: 'bg-green-700' },
  { level: 'B', range: '3417 - 3525', min: 3417, color: '#16a34a', bgColor: 'bg-green-600' },
  { level: 'C', range: '3240 - 3416', min: 3240, color: '#4ade80', bgColor: 'bg-green-400' },
  { level: 'D', range: '3214 - 3239', min: 3214, color: '#0f766e', bgColor: 'bg-teal-700' },
  { level: 'E', range: '3143 - 3213', min: 3143, color: '#06b6d4', bgColor: 'bg-cyan-500' },
  { level: 'F', range: '3088 - 3142', min: 3088, color: '#67e8f9', bgColor: 'bg-cyan-300' },
  { level: 'G', range: '2990 - 3087', min: 2990, color: '#fbbf24', bgColor: 'bg-yellow-400' },
  { level: 'H', range: '2868 - 2989', min: 2868, color: '#fb923c', bgColor: 'bg-orange-400' },
  { level: 'I', range: '1820 - 2867', min: 1820, color: '#ea580c', bgColor: 'bg-orange-600' },
  { level: 'J', range: '1000 - 1819', min: 1000, color: '#dc2626', bgColor: 'bg-red-600' },
];

function getGrade(score: number): string {
  for (const range of SCORE_RANGES) {
    if (score >= range.min) return range.level;
  }
  return 'J';
}

function getStatusIcon(status: string) {
  if (status === 'good') return <CheckCircle className="w-4 h-4 text-green-500" />;
  if (status === 'fair') return <AlertCircle className="w-4 h-4 text-yellow-500" />;
  return <XCircle className="w-4 h-4 text-red-500" />;
}

export default function CreditScore() {
  const { user } = useAuth();
  const { companies } = useData();
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Get company data for score factors
  const company = companies.find(c => c.id === user?.companyId) || companies[0];

  const creditScore = company?.creditScore || user?.creditScore || 3468;
  const grade = getGrade(creditScore);
  const maxScore = 4000;
  const minScore = 1000;

  const scorePercentage = ((creditScore - minScore) / (maxScore - minScore)) * 100;
  const gaugeAngle = (scorePercentage / 100) * 180;

  const approvalRate = creditScore >= 3500 ? 99.8 : creditScore >= 3200 ? 95.2 : 85.0;
  const percentileRank = creditScore >= 3500 ? 89.4 : creditScore >= 3200 ? 63.8 : 36.4;

  const historyData = company?.scoreHistory || [
    { date: 'Jan', score: 3420 }, { date: 'Feb', score: 3450 }, { date: 'Mar', score: 3468 },
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 1500));
    setRefreshing(false);
    toast.success('Trust score refreshed successfully');
  };

  const handleDownload = () => {
    toast.success('Credit report PDF download started');
  };

  const toggleSection = (s: string) => setExpandedSection(expandedSection === s ? null : s);

  if (user?.role !== 'company_user') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <main className="lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8">
          <div className="text-center py-20">
            <Shield className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Trust Score Not Available</h2>
            <p className="text-gray-500">Trust scores are only available for renovation companies.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8">
        <div className="space-y-6 max-w-5xl">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Trust Score Details</h1>
              <p className="text-gray-500 mt-1">As of {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="gap-2">
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Updating...' : 'Refresh Score'}
              </Button>
              <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700 gap-2">
                <Download className="w-4 h-4" />Download Report
              </Button>
            </div>
          </div>

          {/* Score Overview */}
          <Card>
            <CardContent className="p-6 lg:p-8">
              <div className="flex items-center gap-2 mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <p className="text-sm text-blue-800">
                  This is your DecoFinance trust score. Scores are graded A–J based on your business performance, compliance, and financial history.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Gauge */}
                <div className="flex flex-col items-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative w-72 h-44 mb-4"
                  >
                    <svg viewBox="0 0 200 120" className="w-full h-full">
                      {/* Background arc */}
                      <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e5e7eb" strokeWidth="14" strokeLinecap="round" />
                      {/* Colored arc */}
                      <motion.path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="14"
                        strokeLinecap="round"
                        strokeDasharray={`${(gaugeAngle / 180) * 251.2} 251.2`}
                        initial={{ strokeDasharray: '0 251.2' }}
                        animate={{ strokeDasharray: `${(gaugeAngle / 180) * 251.2} 251.2` }}
                        transition={{ duration: 1.5, delay: 0.3 }}
                      />
                      <text x="100" y="85" textAnchor="middle" style={{ fontSize: '32px', fontWeight: 'bold', fill: '#15803d' }}>
                        {creditScore}
                      </text>
                    </svg>
                    <div className="absolute bottom-3 left-4 text-xs text-gray-400">{minScore} / J</div>
                    <div className="absolute bottom-3 right-4 text-xs text-gray-400">{maxScore} / A</div>
                  </motion.div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900 mb-1">Grade {grade}</div>
                    <div className="text-gray-500 mb-3">{company?.trustLevel || 'High'} Trust Level</div>
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <TrendingUp className="w-4 h-4" />
                      <span>+18 points this month</span>
                    </div>
                  </div>
                </div>

                {/* Score Ranges */}
                <div className="space-y-2">
                  {SCORE_RANGES.map((range, index) => (
                    <motion.div
                      key={range.level}
                      initial={{ x: 50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.04, duration: 0.3 }}
                      className="flex items-center gap-2"
                    >
                      <div className="w-8 h-7 flex items-center justify-center bg-gray-100 rounded text-xs font-bold text-gray-700">
                        {range.level}
                      </div>
                      <div className={`flex-1 h-7 ${range.bgColor} rounded flex items-center justify-end px-3 text-white text-xs font-medium`}>
                        {range.range}
                      </div>
                      {range.level === grade && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex items-center gap-1.5 bg-gray-900 text-white px-3 py-1 rounded-lg text-sm font-bold"
                        >
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                          {creditScore}
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Score Ranking */}
          <Card>
            <CardHeader>
              <CardTitle>Credit Score Rankings</CardTitle>
              <CardDescription>How your score compares to other renovation companies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  { label: 'Loan Approval Probability', value: approvalRate, desc: `Based on your score, there is a ${approvalRate}% probability your loan applications will be approved in the next 12 months.`, color: '#22c55e' },
                  { label: 'Industry Percentile', value: percentileRank, desc: `Your trust score is higher than ${percentileRank}% of renovation companies in the platform.`, color: '#2563eb' },
                ].map(({ label, value, desc, color }) => (
                  <div key={label} className="flex flex-col items-center">
                    <div className="relative w-40 h-40 mb-3">
                      <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                        <circle cx="100" cy="100" r="80" fill="none" stroke="#e5e7eb" strokeWidth="18" />
                        <motion.circle
                          cx="100" cy="100" r="80" fill="none" stroke={color} strokeWidth="18"
                          strokeDasharray={`${(value / 100) * 502.4} 502.4`}
                          strokeLinecap="round"
                          initial={{ strokeDasharray: '0 502.4' }}
                          animate={{ strokeDasharray: `${(value / 100) * 502.4} 502.4` }}
                          transition={{ duration: 1.2, delay: 0.5 }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-3xl font-bold" style={{ color }}>{value}%</div>
                      </div>
                    </div>
                    <div className="font-semibold text-gray-900 mb-1 text-center">{label}</div>
                    <p className="text-sm text-gray-500 text-center">{desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Score History */}
          <Card>
            <CardHeader>
              <CardTitle>Trust Score History</CardTitle>
              <CardDescription>7-month score trend</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis domain={[3100, 3600]} fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                    <ReferenceLine y={3417} stroke="#22c55e" strokeDasharray="4 4" label={{ value: 'Grade A threshold', fontSize: 11, fill: '#22c55e' }} />
                    <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={3} dot={{ fill: '#2563eb', r: 5 }} activeDot={{ r: 7 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Score Factors */}
          <Card>
            <CardHeader>
              <CardTitle>Score Factor Analysis</CardTitle>
              <CardDescription>Breakdown of factors affecting your trust score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(company?.scoreFactors || []).map(factor => (
                  <div key={factor.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(factor.status)}
                        <span className="text-sm font-medium text-gray-900">{factor.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">{factor.score} / {factor.maxScore}</span>
                        <Badge className={
                          factor.status === 'good' ? 'bg-green-100 text-green-700' :
                          factor.status === 'fair' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }>{factor.status}</Badge>
                      </div>
                    </div>
                    <Progress value={(factor.score / factor.maxScore) * 100} className="h-2" />
                    <p className="text-xs text-gray-500">{factor.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* FAQ Sections */}
          <Card>
            <CardHeader><CardTitle>Score Information</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                {
                  key: 'factors',
                  title: 'What affects your trust score?',
                  content: 'Your DecoFinance trust score is based on 8 key factors: payment history, project completion rate, compliance & licensing, financial stability, customer satisfaction, insurance coverage, OSH compliance, and ESG performance. Each factor is weighted based on its importance to renovation industry trustworthiness.',
                },
                {
                  key: 'improve',
                  title: 'How to improve your score',
                  content: 'Maintain on-time payments, complete projects within agreed timelines, keep all licences current, maintain comprehensive insurance coverage, achieve OSH certification, improve your ESG practices, and build a track record of satisfied customers. Scores typically improve within 3-6 months of consistent good performance.',
                },
                {
                  key: 'loans',
                  title: 'How does your score affect loan rates?',
                  content: 'Grade A (3526+): 3.5-4.5% p.a. | Grade B (3417-3525): 4.5-5.5% p.a. | Grade C-D (3214-3416): 5.5-7% p.a. | Grade E-G (2990-3213): 7-10% p.a. | Grade H-J: may require additional collateral.',
                },
              ].map(({ key, title, content }) => (
                <div key={key} className="border rounded-lg">
                  <button
                    onClick={() => toggleSection(key)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className="font-medium text-gray-900">{title}</span>
                    {expandedSection === key ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </button>
                  {expandedSection === key && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="px-4 pb-4 border-t"
                    >
                      <p className="text-sm text-gray-600 pt-3">{content}</p>
                    </motion.div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Help Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-600 text-white p-6 rounded-xl">
            {[
              { icon: '❓', title: 'Need Help?', link: 'Customer Support' },
              { icon: '📄', title: 'Credit Resources', link: 'Score Methodology (PDF)' },
              { icon: '🏆', title: 'Improve Your Grade', link: 'Best Practices Guide' },
            ].map(({ icon, title, link }) => (
              <div key={title} className="text-center">
                <div className="text-2xl mb-2">{icon}</div>
                <div className="font-semibold mb-1">{title}</div>
                <button className="text-sm text-blue-200 underline hover:no-underline">{link}</button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
