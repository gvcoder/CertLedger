import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Course } from '../types';
import { BookOpen, ArrowLeft, ArrowRight, Award, CheckCircle2, Shield } from 'lucide-react';

export const CourseReader: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/courses/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setCourse(data.course);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <span>Loading course reading material...</span>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="py-20 text-center text-slate-300">
        <p>Course not found.</p>
        <Link to="/student" className="text-indigo-400 underline text-sm mt-2 inline-block">Return to Student Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      
      {/* Back button */}
      <Link to="/student" className="inline-flex items-center space-x-2 text-sm text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Courses</span>
      </Link>

      {/* Course Header */}
      <div className="glass-panel p-8 rounded-3xl border border-indigo-500/20 space-y-4">
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-medium">
            {course.category}
          </span>
          <span className="text-xs text-slate-400 font-mono">ID: {course.id}</span>
        </div>

        <h1 className="text-3xl font-bold text-white font-outfit leading-tight">{course.title}</h1>
        <p className="text-sm text-slate-300 leading-relaxed">{course.description}</p>
        
        <div className="flex items-center space-x-4 text-xs text-slate-400 pt-2 border-t border-slate-800">
          <span>Instructor: <strong className="text-slate-200">{course.teacherName}</strong></span>
          <span>•</span>
          <span>Assessment: <strong className="text-cyan-300">5 Questions (80% Pass)</strong></span>
        </div>
      </div>

      {/* 1-Page Course Reading Content */}
      <div className="glass-panel p-8 rounded-3xl border border-slate-800 space-y-6">
        <div className="flex items-center space-x-2 text-indigo-400 border-b border-slate-800 pb-4">
          <BookOpen className="w-5 h-5" />
          <h2 className="text-xl font-bold text-white font-outfit">Course Reading Material</h2>
        </div>

        <div className="prose prose-invert max-w-none text-slate-300 text-base leading-relaxed space-y-4 whitespace-pre-line font-sans">
          {course.content}
        </div>
      </div>

      {/* Action Footer to take exam */}
      <div className="glass-panel p-6 rounded-2xl border border-cyan-500/30 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-cyan-400" />
            Ready to test your knowledge?
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Take the 5-question exam to initiate your Hyperledger Fabric certificate.</p>
        </div>

        <button
          onClick={() => navigate(`/course/${course.id}/exam`)}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 hover:scale-[1.02] transition-transform flex items-center space-x-2"
        >
          <span>Take 5-Question Exam</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
