import { Link } from 'react-router';
import { Button } from './ui/button';
import { Shield } from 'lucide-react';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl text-gray-900">DecoFinance</span>
              <span className="text-xs text-gray-500 hidden sm:block">Trust & Financing Ecosystem</span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#trust-scoring" className="text-gray-700 hover:text-blue-600 transition-colors text-sm">Trust Scoring</a>
            <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors text-sm">Features</a>
            <a href="#how-it-works" className="text-gray-700 hover:text-blue-600 transition-colors text-sm">How It Works</a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="outline" size="sm">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Get Started</Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
