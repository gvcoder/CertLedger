import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { VerificationBadge } from '../components/VerificationBadge';
import { CertificateAsset, VerificationResult } from '../types';
import { ShieldCheck, CheckCircle2, Search, ExternalLink, Printer, Share2, History, AlertTriangle, Building2, School, UserCheck } from 'lucide-react';

export const VerifyCertificatePage: React.FC = () => {
  const { certificateId: paramCertId } = useParams<{ certificateId: string }>();
  const navigate = useNavigate();

  const [searchId, setSearchId] = useState(paramCertId || 'CERT-2026-1001');
  const [data, setData] = useState<VerificationResult | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (paramCertId) {
      verifyCert(paramCertId);
    } else {
      verifyCert('CERT-2026-1001');
    }
  }, [paramCertId]);

  const verifyCert = async (certId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/certificates/public/verify/${certId}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setData({ found: false, error: json.error });
      }

      // Fetch History
      const histRes = await fetch(`/api/certificates/public/history/${certId}`);
      const histJson = await histRes.json();
      if (histJson.success) setHistory(histJson.history);
    } catch (err) {
      setData({ found: false, error: 'Network error verifying certificate.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      navigate(`/verify/${searchId.trim()}`);
    }
  };

  const shareableUrl = window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    alert('Public verification link copied to clipboard!');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      
      {/* Search Header */}
      <div className="glass-panel p-6 rounded-3xl border border-cyan-500/30 no-print">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">Public Credential Verification</span>
            <h1 className="text-2xl font-bold text-white font-outfit mt-0.5">Recruiter Verification Portal</h1>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchId}
                onChange={e => setSearchId(e.target.value)}
                placeholder="Enter Certificate ID..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <button type="submit" className="px-4 py-2 rounded-xl bg-cyan-600 text-white font-semibold text-xs hover:bg-cyan-500 transition-all">
              Verify
            </button>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <span>Querying Hyperledger Fabric Ledger State...</span>
        </div>
      ) : !data || !data.found || !data.certificate ? (
        <div className="glass-panel p-10 rounded-3xl text-center space-y-4 border border-rose-500/30">
          <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-2xl font-bold text-white font-outfit">Certificate Not Found or Invalid</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            No matching state record was found on the Hyperledger Fabric ledger for ID <strong className="text-white font-mono">{paramCertId}</strong>.
          </p>
        </div>
      ) : (
        /* Valid Verification View */
        <div className="space-y-8">
          
          {/* Status Alert Banner */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${
            data.verification?.isFullyVerified 
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' 
              : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
          }`}>
            <div className="flex items-center space-x-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <div>
                <h3 className="text-base font-bold text-white">
                  {data.verification?.isFullyVerified ? 'Authentic & Verified on Hyperledger Fabric' : 'Pending Multi-Party Signatures'}
                </h3>
                <p className="text-xs text-slate-300">
                  {data.verification?.isFullyVerified 
                    ? '3-Way Multi-Party Consensus verified: Student + Academic Teacher + Platform Super-Admin.' 
                    : `Current Status: ${data.verification?.currentStatus.replace(/_/g, ' ')}`}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 no-print">
              <button
                onClick={() => setShowHistoryModal(true)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono flex items-center space-x-1"
              >
                <History className="w-3.5 h-3.5" />
                <span>Audit History</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-lg bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600 hover:text-white text-xs font-medium flex items-center space-x-1"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Link</span>
              </button>

              <button
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium flex items-center space-x-1 shadow-md shadow-indigo-600/30"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Certificate</span>
              </button>
            </div>
          </div>

          {/* 3-Way Multi-Party Signature Stepper UI */}
          <VerificationBadge certificate={data.certificate} />

          {/* Printable Formal Diploma Card */}
          <div className="glass-panel p-10 rounded-3xl border border-indigo-500/30 space-y-8 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Diploma Top Bar */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-6">
              <div>
                <span className="text-xs font-mono text-cyan-400 tracking-widest uppercase font-semibold">Official Academic Credential</span>
                <h2 className="text-3xl font-extrabold text-white font-outfit mt-1">Certificate of Completion</h2>
              </div>
              <div className="text-right font-mono text-xs text-slate-400">
                <div>ID: <strong className="text-white">{data.certificate.certificateId}</strong></div>
                <div>Issued: {new Date(data.certificate.issueTimestamp).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Diploma Body */}
            <div className="space-y-6 text-center py-4">
              <p className="text-slate-400 text-sm italic">This certifies that</p>
              
              <h3 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-indigo-300 font-outfit">
                {data.certificate.studentName}
              </h3>

              <p className="text-slate-300 text-sm max-w-xl mx-auto">
                has successfully completed all academic requirements and passed the comprehensive 5-question exam with a grade of <strong className="text-emerald-400 font-mono">{data.certificate.score}%</strong> for:
              </p>

              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 max-w-2xl mx-auto">
                <h4 className="text-xl font-bold text-white font-outfit">{data.certificate.courseTitle}</h4>
              </div>
            </div>

            {/* Bottom Proof Details & Live QR Code */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-800 text-left items-center">
              
              {/* QR Code */}
              <div className="flex items-center space-x-3 bg-white p-3 rounded-xl w-fit">
                <QRCodeSVG value={shareableUrl} size={80} />
                <div className="text-[10px] text-slate-900 font-mono space-y-0.5">
                  <span className="font-bold block">Scan to Verify</span>
                  <span>Direct Ledger Lookup</span>
                </div>
              </div>

              {/* Hashes & Signatures Proof */}
              <div className="md:col-span-2 space-y-1 font-mono text-[11px] text-slate-400 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div className="truncate">
                  Completion Proof Hash: <span className="text-slate-200">{data.certificate.completionHash}</span>
                </div>
                <div>Academic Authority: <span className="text-purple-300">{data.certificate.teacherName}</span></div>
                <div>Platform Authority: <span className="text-cyan-300">{data.certificate.platformAdminId || 'EdX Provider'}</span></div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* History Audit Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-2xl w-full p-6 rounded-3xl border border-slate-700 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white font-outfit flex items-center gap-2">
                <History className="w-5 h-5 text-cyan-400" />
                Immutable Ledger History Trail ({history.length} Events)
              </h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {history.map((h, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <div className="flex justify-between text-indigo-400 font-bold">
                    <span>Tx ID: {h.txId}</span>
                    <span className="text-slate-400 text-[10px]">{new Date(h.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="text-slate-300">
                    Status: <strong className="text-emerald-400">{h.value?.status}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
