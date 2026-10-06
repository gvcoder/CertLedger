import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CertificateAsset, User } from '../types';
import { Cpu, ShieldCheck, Building2, CheckCircle2, Clock, Activity, Database, Users } from 'lucide-react';

export const SuperAdminDashboard: React.FC = () => {
  const { token } = useAuth();

  const [pendingPlatform, setPendingPlatform] = useState<CertificateAsset[]>([]);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Pending Platform Co-Signatures
      const pendingRes = await fetch('/api/certificates/pending/platform', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const pendingData = await pendingRes.json();
      if (pendingData.success) setPendingPlatform(pendingData.pendingCertificates);

      // Fabric Telemetry
      const telRes = await fetch('/api/fabric/telemetry');
      const telData = await telRes.json();
      if (telData.success) setTelemetry(telData.telemetry);

      // User Registry
      const userRes = await fetch('/api/auth/users');
      const userData = await userRes.json();
      if (userData.success) setUsers(userData.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlatformSign = async (certificateId: string) => {
    setSigningId(certificateId);
    try {
      const res = await fetch(`/api/certificates/${certificateId}/sign/platform`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        alert(`🎉 Platform Endorsement Applied! Certificate ${certificateId} is now ISSUED_VALID on Hyperledger Fabric!`);
        fetchData();
      } else {
        alert(data.error || 'Endorsement failed.');
      }
    } catch (err) {
      alert('Endorsement process encountered an error.');
    } finally {
      setSigningId(null);
    }
  };

  return (
    <div className="space-y-10 py-6">
      
      {/* Header */}
      <div className="glass-panel p-8 rounded-3xl border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">Super-Admin Governance</span>
          <h1 className="text-3xl font-bold text-white font-outfit mt-1">EdX / Coursera Platform Control</h1>
          <p className="text-slate-400 text-sm mt-1">Execute final 3-way platform endorsements and audit Hyperledger Fabric blocks.</p>
        </div>

        <div className="flex items-center space-x-3 bg-slate-900/90 px-4 py-2.5 rounded-2xl border border-cyan-500/30">
          <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
          <div className="text-xs font-mono">
            <span className="text-slate-400 block">Ledger Channel</span>
            <span className="text-white font-bold">{telemetry?.channel || 'certchannel'}</span>
          </div>
        </div>
      </div>

      {/* Platform Endorsement Queue Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white font-outfit flex items-center gap-2">
            <Building2 className="w-5 h-5 text-cyan-400" />
            Platform Endorsement Queue ({pendingPlatform.length})
          </h2>
        </div>

        {pendingPlatform.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl text-center space-y-2 border border-slate-800">
            <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No Certificates Awaiting Endorsement</h3>
            <p className="text-xs text-slate-400">All co-signed certificates have received final platform endorsement.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pendingPlatform.map(cert => (
              <div key={cert.certificateId} className="glass-panel p-6 rounded-2xl border border-cyan-500/40 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-cyan-400 font-bold">{cert.certificateId}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Pending Platform Endorsement
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white">{cert.courseTitle}</h4>
                  <p className="text-xs text-slate-300 mt-1">Student: <strong className="text-white">{cert.studentName}</strong></p>
                  <p className="text-xs text-slate-300">Instructor: <strong className="text-white">{cert.teacherName}</strong></p>
                </div>

                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-xs font-mono space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>1. Student Sign-off:</span>
                    <span className="text-emerald-400">✓ Signed</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>2. Academic Co-Sign:</span>
                    <span className="text-emerald-400">✓ Signed ({cert.signatures.teacher?.signerName})</span>
                  </div>
                </div>

                <button
                  onClick={() => handlePlatformSign(cert.certificateId)}
                  disabled={signingId === cert.certificateId}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-semibold text-xs shadow-md shadow-cyan-600/30 hover:scale-[1.01] transition-all flex items-center justify-center space-x-2"
                >
                  <Building2 className="w-4 h-4" />
                  <span>{signingId === cert.certificateId ? 'Applying Endorsement...' : 'Apply Final Platform Endorsement'}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Fabric Telemetry & Block Explorer */}
      {telemetry && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white font-outfit flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            Hyperledger Fabric Block Explorer & Telemetry
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-card p-4 rounded-xl space-y-1">
              <span className="text-xs text-slate-400">Total Blocks</span>
              <div className="text-2xl font-bold text-white font-mono">{telemetry.totalBlocks}</div>
            </div>
            <div className="glass-card p-4 rounded-xl space-y-1">
              <span className="text-xs text-slate-400">Total Certificates</span>
              <div className="text-2xl font-bold text-cyan-400 font-mono">{telemetry.totalCertificates}</div>
            </div>
            <div className="glass-card p-4 rounded-xl space-y-1">
              <span className="text-xs text-slate-400">Issued Valid</span>
              <div className="text-2xl font-bold text-emerald-400 font-mono">{telemetry.metrics?.issuedValid}</div>
            </div>
            <div className="glass-card p-4 rounded-xl space-y-1">
              <span className="text-xs text-slate-400">Awaiting Signatures</span>
              <div className="text-2xl font-bold text-amber-400 font-mono">
                {(telemetry.metrics?.pendingTeacher || 0) + (telemetry.metrics?.pendingPlatform || 0)}
              </div>
            </div>
          </div>

          {/* Recent Blocks List */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider">Recent Fabric Ledger Blocks</h3>

            <div className="space-y-3">
              {telemetry.recentBlocks?.map((block: any) => (
                <div key={block.blockNumber} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 font-mono text-xs">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold mr-2">Block #{block.blockNumber}</span>
                    <span className="text-slate-400 truncate max-w-xs inline-block">Hash: {block.dataHash}</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Timestamp: {new Date(block.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Registered Users Table */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white font-outfit flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" />
          Registered Platform Users ({users.length})
        </h2>

        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-mono">
                <th className="p-4">User ID</th>
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Institution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-900/40">
                  <td className="p-4 font-mono font-semibold text-slate-300">{u.id}</td>
                  <td className="p-4 font-bold text-white">{u.name}</td>
                  <td className="p-4 text-slate-300">{u.email}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono ${
                      u.role === 'SUPER_ADMIN' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                      u.role === 'TEACHER' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400">{u.institution || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
};
