import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../contexts/auth-context';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Shield, Building2, User, ClipboardList, Settings } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

const DEMO_ACCOUNTS = [
  { role: 'Company User', email: 'company@demo.com', icon: Building2, color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { role: 'Customer', email: 'customer@demo.com', icon: User, color: 'bg-green-50 border-green-200 text-green-700' },
  { role: 'Reviewer', email: 'reviewer@demo.com', icon: ClipboardList, color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { role: 'Admin', email: 'admin@demo.com', icon: Settings, color: 'bg-red-50 border-red-200 text-red-700' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      // Redirect based on role
      if (email.includes('admin')) navigate('/admin');
      else if (email.includes('reviewer')) navigate('/dashboard');
      else navigate('/dashboard');
      toast.success('Welcome back!');
    } catch (error) {
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loginAs = async (demoEmail: string) => {
    setLoading(true);
    try {
      await login(demoEmail, 'demo');
      navigate('/dashboard');
      toast.success(`Logged in as ${demoEmail}`);
    } catch {
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">DecoFinance</span>
          </Link>

          <Card className="border-0 shadow-none">
            <CardHeader className="px-0">
              <CardTitle className="text-3xl">Sign In</CardTitle>
              <CardDescription>Access your renovation trust platform</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <form onSubmit={handleSubmit} className="space-y-4 mb-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Quick Demo Access</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((account) => {
                  const Icon = account.icon;
                  return (
                    <button
                      key={account.email}
                      onClick={() => loginAs(account.email)}
                      disabled={loading}
                      className={`flex items-center gap-2 p-3 border rounded-lg text-left transition-all hover:shadow-sm ${account.color}`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-semibold">{account.role}</div>
                        <div className="text-xs opacity-70 truncate">{account.email}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 text-center text-sm">
                <span className="text-gray-600">Don't have an account? </span>
                <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign up
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Panel */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 to-blue-800 p-12 items-center justify-center relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 text-white text-center max-w-lg"
        >
          <Shield className="w-20 h-20 mx-auto mb-6 text-blue-200" />
          <h2 className="text-3xl font-bold mb-4">Trust-Based Financing</h2>
          <p className="text-blue-100 mb-8">
            The renovation industry's first comprehensive trust and credit scoring platform. Build credibility, secure financing, and manage projects transparently.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[['10K+', 'Companies'], ['$500M+', 'Loans'], ['98%', 'Satisfaction']].map(([val, label]) => (
              <div key={label} className="bg-white/10 rounded-xl p-4">
                <div className="text-2xl font-bold">{val}</div>
                <div className="text-xs text-blue-200">{label}</div>
              </div>
            ))}
          </div>
        </motion.div>
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute -top-20 -right-20 w-96 h-96 bg-blue-400 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute -bottom-20 -left-20 w-96 h-96 bg-blue-500 rounded-full blur-3xl"
          />
        </div>
      </div>
    </div>
  );
}
