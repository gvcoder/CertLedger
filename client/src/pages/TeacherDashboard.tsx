import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Course, CertificateAsset } from '../types';
import { Plus, CheckSquare, BookOpen, Clock, ShieldCheck, UserCheck } from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [pendingCertificates, setPendingCertificates] = useState<CertificateAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingId, setSigningId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const cRes = await fetch('/api/courses');
      const cData = await cRes.json();
      if (cData.success) setCourses(cData.courses);

      if (token) {
        const pendingRes = await fetch('/api/certificates/pending/teacher', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const pendingData = await pendingRes.json();
        if (pendingData.success) setPendingCertificates(pendingData.pendingCertificates);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherSign = async (certificateId: string) => {
    setSigningId(certificateId);
    try {
      const res = await fetch(`/api/certificates/${certificateId}/sign/teacher`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        alert(`Academic signature successfully applied to ${certificateId}! Certificate forwarded to EdX Platform Provider.`);
        fetchData();
      } else {
        alert(data.error || 'Signature failed.');
      }
    } catch (err) {
      alert('Signature process encountered an error.');
    } finally {
      setSigningId(null);
    }
  };

  return (
    <div className="space-y-10 py-6">
      
      {/* Header Banner */}
      <div className="glass-panel p-8 rounded-3xl border border-purple-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-mono font-semibold text-purple-400 uppercase tracking-wider">Teacher Workspace</span>
          <h1 className="text-3xl font-bold text-white font-outfit mt-1">Instructor Control Center</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your courses, generate AI assessments, and co-sign student completion certificates.</p>
        </div>

        <Link
          to="/teacher/create-course"
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-purple-600/30 hover:scale-[1.02] transition-transform flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Create New Course + AI Quiz</span>
        </Link>
      </div>

      {/* Academic Signature Queue Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white font-outfit flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-purple-400" />
            Academic Signature Review Queue ({pendingCertificates.length})
          </h2>
        </div>

        {pendingCertificates.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl text-center space-y-2 border border-slate-800">
            <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No Pending Student Certificates</h3>
            <p className="text-xs text-slate-400">All submitted student certificates have been reviewed and co-signed.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pendingCertificates.map(cert => (
              <div key={cert.certificateId} className="glass-panel p-6 rounded-2xl border border-purple-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-purple-400 font-bold">{cert.certificateId}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Pending Academic Signature
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white">{cert.courseTitle}</h4>
                  <div className="flex items-center space-x-2 mt-2 text-xs text-slate-300">
                    <UserCheck className="w-4 h-4 text-indigo-400" />
                    <span>Student: <strong className="text-white">{cert.studentName}</strong> ({cert.studentId})</span>
                  </div>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs font-mono space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Exam Score:</span>
                    <span className="text-emerald-400 font-bold">{cert.score}%</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Student Signature Hash:</span>
                    <span className="text-slate-300 truncate max-w-[180px]">{cert.signatures.student?.signatureHash}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleTeacherSign(cert.certificateId)}
                  disabled={signingId === cert.certificateId}
                  className="w-full py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-xs shadow-md hover:bg-purple-500 transition-all flex items-center justify-center space-x-2"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>{signingId === cert.certificateId ? 'Applying Signature...' : 'Co-Sign Certificate'}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Course List Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white font-outfit flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          Active Courses ({courses.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.map(course => (
            <div key={course.id} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-indigo-400 font-semibold">{course.category}</span>
                <span className="text-xs text-slate-400 font-mono">ID: {course.id}</span>
              </div>
              <h3 className="text-lg font-bold text-white">{course.title}</h3>
              <p className="text-xs text-slate-400 line-clamp-2">{course.description}</p>
              <div className="pt-2 text-xs text-slate-400 border-t border-slate-800 flex justify-between">
                <span>5 Questions (AI Generated)</span>
                <span>Instructor: {course.teacherName}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};
