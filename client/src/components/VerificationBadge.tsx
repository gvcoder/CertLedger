import React from 'react';
import { CertificateAsset } from '../types';
import { CheckCircle2, Clock, ShieldCheck, UserCheck, School, Building2 } from 'lucide-react';

interface Props {
  certificate: CertificateAsset;
}

export const VerificationBadge: React.FC<Props> = ({ certificate }) => {
  const { signatures, status } = certificate;

  const isStudentSigned = !!signatures.student?.signed;
  const isTeacherSigned = !!signatures.teacher?.signed;
  const isPlatformSigned = !!signatures.platformAdmin?.signed;

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <div>
          <h4 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            Hyperledger Fabric 3-Way Multi-Party Consensus
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Certificates require cryptographic signatures from Student, Teacher, and EdX/Coursera Platform Authority.
          </p>
        </div>
        <div className="text-right">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
            status === 'ISSUED_VALID' 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
          }`}>
            {status === 'ISSUED_VALID' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            {status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* 3-Step Signature Stepper */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Step 1: Student Signature */}
        <div className={`p-4 rounded-xl border transition-all ${
          isStudentSigned 
            ? 'bg-indigo-950/30 border-indigo-500/40 text-slate-200' 
            : 'bg-slate-900/40 border-slate-800 text-slate-500'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-semibold text-indigo-400 uppercase">1. Student Exam Sign-off</span>
            {isStudentSigned ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Clock className="w-4 h-4 text-slate-500" />
            )}
          </div>
          <div className="flex items-center gap-2 mb-1">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-semibold text-white">{certificate.studentName}</span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono truncate">
            Hash: {signatures.student?.signatureHash || 'Pending'}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            Signed: {signatures.student?.signedAt ? new Date(signatures.student.signedAt).toLocaleDateString() : 'N/A'}
          </p>
        </div>

        {/* Step 2: Teacher Academic Co-Sign */}
        <div className={`p-4 rounded-xl border transition-all ${
          isTeacherSigned 
            ? 'bg-purple-950/30 border-purple-500/40 text-slate-200' 
            : 'bg-slate-900/40 border-slate-800 text-slate-500'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-semibold text-purple-400 uppercase">2. Academic Co-Sign</span>
            {isTeacherSigned ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-2 mb-1">
            <School className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold text-white">{certificate.teacherName}</span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono truncate">
            Hash: {signatures.teacher?.signatureHash || 'Awaiting Teacher Review'}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            Signed: {signatures.teacher?.signedAt ? new Date(signatures.teacher.signedAt).toLocaleDateString() : 'Pending'}
          </p>
        </div>

        {/* Step 3: Platform Super-Admin Endorsement */}
        <div className={`p-4 rounded-xl border transition-all ${
          isPlatformSigned 
            ? 'bg-cyan-950/30 border-cyan-500/40 text-slate-200' 
            : 'bg-slate-900/40 border-slate-800 text-slate-500'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-semibold text-cyan-400 uppercase">3. Platform Endorsement</span>
            {isPlatformSigned ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Clock className="w-4 h-4 text-slate-500" />
            )}
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-white">EdX / Coursera Platform</span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono truncate">
            Hash: {signatures.platformAdmin?.signatureHash || 'Awaiting Final Endorsement'}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            Signed: {signatures.platformAdmin?.signedAt ? new Date(signatures.platformAdmin.signedAt).toLocaleDateString() : 'Pending'}
          </p>
        </div>

      </div>
    </div>
  );
};
