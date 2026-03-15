import { Link } from 'react-router';
import { Header } from '../components/header';
import { Footer } from '../components/footer';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Shield, DollarSign, FileCheck, Scale, UserCheck, BarChart3, Award, TrendingUp, CheckCircle, Building2, FolderKanban, Users } from 'lucide-react';
import { motion } from 'motion/react';

const FEATURES = [
  { icon: Award, title: 'Trust Scoring', description: 'Renovation-specific credit scoring covering payment history, compliance, OSH, ESG and more', color: 'bg-blue-100 text-blue-600', href: '/register' },
  { icon: DollarSign, title: 'Loan Financing', description: 'Apply for renovation loans with competitive rates based on your trust score', color: 'bg-green-100 text-green-600', href: '/register' },
  { icon: FolderKanban, title: 'Project Marketplace', description: 'Post renovation projects or browse and bid on available work', color: 'bg-purple-100 text-purple-600', href: '/register' },
  { icon: FileCheck, title: 'Milestone Workflows', description: 'Structured project milestones with escrow-backed payment releases', color: 'bg-yellow-100 text-yellow-600', href: '/register' },
  { icon: Scale, title: 'Dispute Resolution', description: 'Fair and transparent dispute resolution with expert reviewer oversight', color: 'bg-red-100 text-red-600', href: '/register' },
  { icon: BarChart3, title: 'Audit & Reporting', description: 'Comprehensive audit logs, credit reports, and business analytics', color: 'bg-teal-100 text-teal-600', href: '/register' },
];

const ROLES = [
  { icon: Building2, role: 'Renovation Company', features: ['Build trust score & credit report', 'Bid on customer projects', 'Apply for financing', 'Track milestone payments'], color: 'border-blue-200 bg-blue-50' },
  { icon: Users, role: 'Customer', features: ['Post renovation projects', 'Compare verified contractors', 'Approve milestone payments', 'Raise & track disputes'], color: 'border-green-200 bg-green-50' },
  { icon: UserCheck, role: 'Reviewer', features: ['Review loan applications', 'Resolve disputes', 'Monitor risk exposure', 'Access company reports'], color: 'border-purple-200 bg-purple-50' },
  { icon: BarChart3, role: 'Administrator', features: ['Platform-wide metrics', 'Audit log access', 'Contract management', 'System statistics'], color: 'border-gray-200 bg-gray-50' },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="pt-28 pb-20 px-4 bg-gradient-to-br from-blue-50 via-white to-green-50 relative overflow-hidden">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              Renovation Industry's Trust Platform
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Building a Safe & Transparent<br />
              <span className="text-blue-600">Renovation Credit system</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              DecoFinance combines trust scoring, project management, and renovation financing into one transparent platform for contractors, customers, and lenders.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 px-8">
                  Get Started Free
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="px-8">
                  Try Demo Access
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
        {/* Background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }} transition={{ duration: 20, repeat: Infinity }} className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400 rounded-full blur-3xl" />
          <motion.div animate={{ scale: [1.2, 1, 1.2], rotate: [90, 0, 90] }} transition={{ duration: 15, repeat: Infinity }} className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-400 rounded-full blur-3xl" />
        </div>
      </section>

      {/* Trust Scoring - Primary Feature */}
      <section id="trust-scoring" className="py-20 px-4 bg-gradient-to-br from-blue-600 to-blue-800">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
          >
            <div className="text-white">
              <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full mb-6">
                <Award className="w-5 h-5" />
                <span className="text-sm font-semibold">Core Feature</span>
              </div>
              <h2 className="text-4xl font-bold mb-6">Trust Scoring</h2>
              <p className="text-xl text-blue-100 mb-8">
                The renovation industry's first comprehensive trust and credit scoring system
              </p>
              <div className="space-y-4 mb-8">
                {[
                  'Real-time scoring based on 8 renovation-specific factors',
                  'Grades A–J with detailed factor analysis and history',
                  'Better loan rates and terms based on your trust grade',
                  'Downloadable credit reports for business credibility',
                ].map(item => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                    <p className="text-blue-50 text-sm">{item}</p>
                  </div>
                ))}
              </div>
              <Link to="/register">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                  Check Your Score
                </Button>
              </Link>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <div className="text-sm font-semibold text-blue-200 mb-2">BuildPro Renovation Ltd.</div>
                    <div className="relative w-44 h-44 mx-auto mb-4">
                      <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                        <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="16" />
                        <motion.circle
                          cx="100" cy="100" r="80" fill="none" stroke="#22c55e" strokeWidth="16"
                          strokeDasharray="377 503" strokeLinecap="round"
                          initial={{ strokeDasharray: '0 503' }}
                          whileInView={{ strokeDasharray: '377 503' }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.5, delay: 0.5 }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-5xl font-bold text-white">3468</div>
                          <div className="text-sm text-blue-200">Grade B</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 rounded-xl p-4 text-center">
                      <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold">+18</div>
                      <div className="text-xs text-blue-200">This Month</div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 text-center">
                      <Award className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold">4.5%</div>
                      <div className="text-xs text-blue-200">Loan Rate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Platform Features</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Everything you need to build trust, secure financing, and manage renovation projects transparently</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow border-gray-200">
                    <CardContent className="p-6">
                      <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-4`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                      <p className="text-gray-600 text-sm mb-4">{feature.description}</p>
                      <Link to={feature.href} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        Learn More →
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* User Roles */}
      <section id="how-it-works" className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Built for Every Role</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Different dashboards and workflows tailored to each user's needs</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {ROLES.map(({ icon: Icon, role, features, color }) => (
              <Card key={role} className={`border-2 ${color} hover:shadow-md transition-shadow`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-gray-700" />
                    <CardTitle className="text-base">{role}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/register">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 px-10">
                Register Your Role
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 bg-blue-600 text-white">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[['10,000+', 'Active Companies'], ['$500M+', 'Loans Processed'], ['98%', 'Client Satisfaction']].map(([val, label]) => (
              <motion.div key={label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <div className="text-4xl font-bold mb-2">{val}</div>
                <div className="text-blue-200">{label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Build Trust?</h2>
          <p className="text-gray-600 mb-8">Join thousands of renovation companies and customers on DecoFinance</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 px-10">Start Free</Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="px-10">Try Demo</Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
