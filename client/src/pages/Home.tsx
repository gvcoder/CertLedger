import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Cpu, Award, ExternalLink, Sparkles, CheckCircle, Lock, Users } from 'lucide-react';

export const Home: React.FC = () => {
  const { user, switchRole } = useAuth();

  return (
    <div className="space-y-16 py-8">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl glass-panel p-8 md:p-14 border border-indigo-500/20">
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Hyperledger Fabric Enterprise Blockchain</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white font-outfit leading-tight">
            Secured Course Certificates on <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400">Hyperledger Fabric</span>
          </h1>

          <p className="text-lg text-slate-300 leading-relaxed">
            An immutable, multi-party signed ledger platform for issuing, managing, and publicly verifying academic course credentials with AI-powered assessment generation.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              to={user?.role === 'STUDENT' ? '/student' : user?.role === 'TEACHER' ? '/teacher' : '/admin'}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-600/30 hover:scale-[1.02] transition-transform flex items-center space-x-2"
            >
              <span>Launch {user?.role.replace('_', ' ')} Portal</span>
              <Award className="w-5 h-5" />
            </Link>

            <Link
              to="/verify/CERT-2026-1001"
              className="px-6 py-3.5 rounded-xl bg-slate-900/80 border border-cyan-500/30 text-cyan-300 font-semibold hover:bg-cyan-950/40 hover:border-cyan-400/50 transition-all flex items-center space-x-2"
            >
              <ExternalLink className="w-5 h-5" />
              <span>Public Recruiter Verifier Demo</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Role Switcher Demo Cards */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold text-white font-outfit">Explore Multi-Role Workflows</h2>
          <p className="text-slate-400 text-sm">Switch roles seamlessly to experience the end-to-end certification lifecycle.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Student Card */}
          <div className="glass-card p-6 rounded-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">🎓 Student Portal</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Enrol in courses, study 1-page materials, complete 5-question exams, and request 3-way blockchain credentials.
              </p>
            </div>
            <button
              onClick={() => switchRole('STUDENT')}
              className="w-full py-2.5 rounded-xl bg-indigo-600/20 text-indigo-300 font-medium hover:bg-indigo-600 hover:text-white transition-all text-sm"
            >
              Switch to Student Role
            </button>
          </div>

          {/* Teacher Card */}
          <div className="glass-card p-6 rounded-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">👩‍🏫 Teacher Workspace</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Create courses, use Gemini AI to generate 5-question quizzes from course text, and execute academic co-signatures.
              </p>
            </div>
            <button
              onClick={() => switchRole('TEACHER')}
              className="w-full py-2.5 rounded-xl bg-purple-600/20 text-purple-300 font-medium hover:bg-purple-600 hover:text-white transition-all text-sm"
            >
              Switch to Teacher Role
            </button>
          </div>

          {/* Super-Admin Card */}
          <div className="glass-card p-6 rounded-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">🛡️ Super-Admin (EdX Provider)</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Execute final platform endorsements, monitor Fabric network telemetry, and inspect real-time block hashes.
              </p>
            </div>
            <button
              onClick={() => switchRole('SUPER_ADMIN')}
              className="w-full py-2.5 rounded-xl bg-cyan-600/20 text-cyan-300 font-medium hover:bg-cyan-600 hover:text-white transition-all text-sm"
            >
              Switch to Super-Admin Role
            </button>
          </div>

        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center space-x-3 text-indigo-400">
            <ShieldCheck className="w-6 h-6" />
            <h4 className="text-lg font-bold text-white">3-Way Multi-Party Consensus</h4>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Certificates are not minted unilaterally. Chaincode enforces triple endorsement: Student completion sign-off, Teacher academic verification, and EdX/Coursera Platform Super-Admin endorsement.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center space-x-3 text-purple-400">
            <Sparkles className="w-6 h-6" />
            <h4 className="text-lg font-bold text-white">Gemini AI Question Generator</h4>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Teachers simply paste 1-page course reading materials. Gemini AI automatically analyzes the text and creates 5 relevant multiple-choice questions with answer keys.
          </p>
        </div>
      </section>

    </div>
  );
};
