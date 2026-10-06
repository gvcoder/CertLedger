import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './AuthModal';
import { ShieldCheck, Cpu, UserCheck, BookOpen, CheckSquare, ExternalLink, LogIn, UserPlus } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, switchRole } = useAuth();
  const location = useLocation();
  const [telemetry, setTelemetry] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/fabric/telemetry')
      .then(res => res.json())
      .then(data => {
        if (data.success) setTelemetry(data.telemetry);
      })
      .catch(() => {});
  }, [location.pathname]);

  return (
    <>
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-800 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo & Brand */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-indigo-300 font-outfit tracking-wide">
                  CertLedger
                </span>
                <span className="block text-[10px] text-cyan-400 font-mono tracking-wider uppercase">
                  Hyperledger Fabric Ledger
                </span>
              </div>
            </Link>

            {/* Role Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1">
              <Link
                to="/"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                Home
              </Link>

              {user?.role === 'STUDENT' && (
                <Link
                  to="/student"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                    location.pathname === '/student' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>My Courses & Credentials</span>
                </Link>
              )}

              {user?.role === 'TEACHER' && (
                <Link
                  to="/teacher"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                    location.pathname === '/teacher' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Teacher Workspace</span>
                </Link>
              )}

              {user?.role === 'SUPER_ADMIN' && (
                <Link
                  to="/admin"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                    location.pathname === '/admin' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Cpu className="w-4 h-4" />
                  <span>Super-Admin Governance</span>
                </Link>
              )}

              <Link
                to="/verify/CERT-2026-1001"
                className="px-3 py-2 rounded-lg text-sm font-medium text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/30 border border-cyan-500/20 flex items-center space-x-1.5 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Public Verification Portal</span>
              </Link>
            </nav>

            {/* Right Controls: User Profile / Register Modal & Quick Role Switcher */}
            <div className="flex items-center space-x-3">
              
              {/* Register / Sign In Button */}
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white text-xs font-semibold transition-all flex items-center space-x-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Register / Sign In</span>
              </button>

              {/* Quick Role Switcher */}
              <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-medium">
                <button
                  onClick={() => switchRole('STUDENT')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    user?.role === 'STUDENT'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🎓 Student
                </button>
                <button
                  onClick={() => switchRole('TEACHER')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    user?.role === 'TEACHER'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  👩‍🏫 Teacher
                </button>
                <button
                  onClick={() => switchRole('SUPER_ADMIN')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    user?.role === 'SUPER_ADMIN'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🛡️ Admin
                </button>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
};
