import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth, UserRole } from '../contexts/auth-context';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Shield, Building2, User, ClipboardList, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const ROLES = [
  {
    value: 'company_user' as UserRole,
    label: 'Renovation Company',
    description: 'Manage your company, bid on projects, track trust score',
    icon: Building2,
    color: 'border-blue-500 bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    value: 'customer' as UserRole,
    label: 'Customer',
    description: 'Create renovation projects, manage milestones, hire contractors',
    icon: User,
    color: 'border-green-500 bg-green-50',
    iconColor: 'text-green-600',
  },
  {
    value: 'reviewer' as UserRole,
    label: 'Reviewer',
    description: 'Review loan applications, handle disputes, monitor compliance',
    icon: ClipboardList,
    color: 'border-purple-500 bg-purple-50',
    iconColor: 'text-purple-600',
  },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<UserRole>('company_user');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password, selectedRole, companyName || undefined);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch {
      toast.error('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-gray-900">DecoFinance</span>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step > s ? <CheckCircle className="w-4 h-4" /> : s}
              </div>
              <span className={`text-sm ${step >= s ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                {s === 1 ? 'Choose Role' : 'Account Details'}
              </span>
              {s < 2 && <div className={`w-12 h-0.5 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{step === 1 ? 'Select Your Role' : 'Create Your Account'}</CardTitle>
            <CardDescription>
              {step === 1 ? 'Choose the role that best describes you' : 'Enter your account information'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <div className="space-y-4">
                {ROLES.map((role) => {
                  const Icon = role.icon;
                  const isSelected = selectedRole === role.value;
                  return (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setSelectedRole(role.value)}
                      className={`w-full p-4 border-2 rounded-xl text-left transition-all ${isSelected ? role.color + ' shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-white' : 'bg-gray-100'}`}>
                          <Icon className={`w-5 h-5 ${isSelected ? role.iconColor : 'text-gray-500'}`} />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{role.label}</div>
                          <div className="text-sm text-gray-500 mt-0.5">{role.description}</div>
                        </div>
                        {isSelected && <CheckCircle className={`w-5 h-5 mt-0.5 ${role.iconColor}`} />}
                      </div>
                    </button>
                  );
                })}
                <Button
                  onClick={() => setStep(2)}
                  className="w-full bg-blue-600 hover:bg-blue-700 mt-4"
                >
                  Continue
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Smith"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
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
                </div>

                {selectedRole === 'company_user' && (
                  <div className="space-y-2">
                    <Label htmlFor="company">Company Name</Label>
                    <Input
                      id="company"
                      type="text"
                      placeholder="Your Renovation Company Ltd."
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirm Password</Label>
                    <Input
                      id="confirm"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={loading}>
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </div>
              </form>
            )}

            <div className="mt-4 text-center text-sm">
              <span className="text-gray-600">Already have an account? </span>
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
