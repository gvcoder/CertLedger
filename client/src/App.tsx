import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { StudentDashboard } from './pages/StudentDashboard';
import { CourseReader } from './pages/CourseReader';
import { ExamPage } from './pages/ExamPage';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { CourseEditor } from './pages/CourseEditor';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { VerifyCertificatePage } from './pages/VerifyCertificatePage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col justify-between">
          <div>
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/student" element={<StudentDashboard />} />
                <Route path="/course/:id" element={<CourseReader />} />
                <Route path="/course/:id/exam" element={<ExamPage />} />
                <Route path="/teacher" element={<TeacherDashboard />} />
                <Route path="/teacher/create-course" element={<CourseEditor />} />
                <Route path="/admin" element={<SuperAdminDashboard />} />
                <Route path="/verify/:certificateId" element={<VerifyCertificatePage />} />
                <Route path="/verify" element={<VerifyCertificatePage />} />
              </Routes>
            </main>
          </div>

          <footer className="glass-panel border-t border-slate-800 py-6 text-center text-xs text-slate-500 font-mono no-print">
            <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2">
              <span>CertLedger © 2026 • Hyperledger Fabric Secured Certification Platform</span>
              <span>3-Way Multi-Party Consensus • Student + Teacher + EdX Provider</span>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};
