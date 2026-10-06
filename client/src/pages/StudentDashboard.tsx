import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Course, CertificateAsset } from '../types';
import { BookOpen, Award, CheckCircle2, ArrowRight, ShieldCheck, ExternalLink, Clock } from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [myCertificates, setMyCertificates] = useState<CertificateAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Courses
      const cRes = await fetch('/api/courses');
      const cData = await cRes.json();
      if (cData.success) setCourses(cData.courses);

      // Fetch Student Certificates if token exists
      if (token) {
        const certRes = await fetch('/api/certificates/student/my-certificates', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const certData = await certRes.json();
        if (certData.success) setMyCertificates(certData.certificates);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        alert('Successfully enrolled! You can now start studying the course.');
        fetchData();
      }
    } catch (err) {
      alert('Enrollment failed.');
    }
  };

  return (
    <div className="space-y-10 py-6">
      
      {/* Welcome Banner */}
      <div className="glass-panel p-8 rounded-3xl border border-indigo-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-mono font-semibold text-indigo-400 uppercase tracking-wider">Student Dashboard</span>
          <h1 className="text-3xl font-bold text-white font-outfit mt-1">Welcome back, {user?.name || 'Student'}!</h1>
          <p className="text-slate-400 text-sm mt-1">Explore available courses, take 5-question exams, and manage your Hyperledger Fabric credentials.</p>
        </div>
        <div className="flex items-center space-x-3 bg-slate-900/80 px-4 py-2.5 rounded-2xl border border-slate-800">
          <Award className="w-6 h-6 text-cyan-400" />
          <div>
            <span className="block text-xs text-slate-400">Earned Credentials</span>
            <span className="text-lg font-bold text-white font-mono">{myCertificates.length} Certificates</span>
          </div>
        </div>
      </div>

      {/* Available Courses Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white font-outfit flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            Available Courses ({courses.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.map(course => {
            const cert = myCertificates.find(c => c.courseId === course.id);
            return (
              <div key={course.id} className="glass-card p-6 rounded-2xl flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono">
                      {course.category}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">ID: {course.id}</span>
                  </div>

                  <h3 className="text-lg font-bold text-white leading-snug">{course.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{course.description}</p>
                  
                  <div className="text-xs text-slate-400 flex items-center space-x-1 pt-1">
                    <span>Instructor:</span>
                    <span className="text-slate-200 font-medium">{course.teacherName}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  {cert ? (
                    <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Passed ({cert.score}%) - Cert Issued</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">5 Questions • 80% Passing Score</span>
                  )}

                  <Link
                    to={`/course/${course.id}`}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium text-xs hover:bg-indigo-500 transition-all flex items-center space-x-1 shadow-md shadow-indigo-600/30"
                  >
                    <span>{cert ? 'Review Course' : 'Start Course & Exam'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Earned Credentials Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white font-outfit flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          My Hyperledger Fabric Verified Credentials ({myCertificates.length})
        </h2>

        {myCertificates.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl text-center space-y-2 border border-slate-800">
            <Award className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No Credentials Earned Yet</h3>
            <p className="text-xs text-slate-400">Complete a course and pass the 5-question exam to initiate your 3-way multi-party certificate.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myCertificates.map(cert => (
              <div key={cert.certificateId} className="glass-panel p-6 rounded-2xl border border-cyan-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-cyan-400 font-semibold">{cert.certificateId}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                    cert.status === 'ISSUED_VALID' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {cert.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white">{cert.courseTitle}</h4>
                  <p className="text-xs text-slate-400 mt-1">Instructor: {cert.teacherName}</p>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Student Sign-off:</span>
                    <span className="text-emerald-400">✓ Signed</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Academic Co-sign:</span>
                    <span className={cert.signatures.teacher?.signed ? 'text-emerald-400' : 'text-amber-400'}>
                      {cert.signatures.teacher?.signed ? '✓ Signed' : '⏳ Pending Review'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Platform Endorsement:</span>
                    <span className={cert.signatures.platformAdmin?.signed ? 'text-emerald-400' : 'text-slate-500'}>
                      {cert.signatures.platformAdmin?.signed ? '✓ Signed' : '⏳ Awaiting Endorsement'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-400">Score: {cert.score}%</span>
                  <Link
                    to={`/verify/${cert.certificateId}`}
                    className="px-3.5 py-1.5 rounded-lg bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600 hover:text-white transition-all text-xs font-medium flex items-center space-x-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View / Share Recruiter Link</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
};
