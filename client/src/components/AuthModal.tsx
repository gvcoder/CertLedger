import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { UserCheck, ShieldCheck, Mail, User, School, X, LogIn, UserPlus } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [institution, setInstitution] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isRegisterMode) {
        if (!name || !email) {
          alert('Name and Email are required.');
          return;
        }
        await register(name, email, role, institution);
        alert(`Account created successfully! Logged in as ${name} (${role}).`);
      } else {
        if (!email) {
          alert('Email is required.');
          return;
        }
        await login(email, role, name, institution);
        alert(`Logged in successfully!`);
      }
      onClose();
    } catch (err: any) {
      alert(err.message || 'Authentication error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel max-w-md w-full p-8 rounded-3xl border border-indigo-500/30 space-y-6 relative animate-in fade-in zoom-in duration-200">
        
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto mb-2">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-white font-outfit">
            {isRegisterMode ? 'Create New Account' : 'Sign In to CertLedger'}
          </h2>
          <p className="text-xs text-slate-400">
            {isRegisterMode ? 'Register as a Student or Teacher on Hyperledger Fabric' : 'Access your courses, exams, and verified credentials'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs font-medium">
          <button
            type="button"
            onClick={() => setIsRegisterMode(false)}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
              !isRegisterMode ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => setIsRegisterMode(true)}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
              isRegisterMode ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register New</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Role Selection */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Select Role</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole('STUDENT')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  role === 'STUDENT' ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                🎓 Student
              </button>
              <button
                type="button"
                onClick={() => setRole('TEACHER')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  role === 'TEACHER' ? 'bg-purple-600/20 border-purple-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                👩‍🏫 Teacher
              </button>
              <button
                type="button"
                onClick={() => setRole('SUPER_ADMIN')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  role === 'SUPER_ADMIN' ? 'bg-cyan-600/20 border-cyan-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                🛡️ Admin
              </button>
            </div>
          </div>

          {isRegisterMode && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Maria Gonzalez"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Email Address *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. maria@university.edu"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">University / Institution (Optional)</label>
            <div className="relative">
              <School className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={institution}
                onChange={e => setInstitution(e.target.value)}
                placeholder="e.g. Stanford University"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 hover:scale-[1.01] transition-transform"
          >
            {submitting ? 'Authenticating...' : isRegisterMode ? 'Register & Sign In' : 'Sign In'}
          </button>

        </form>
      </div>
    </div>
  );
};
