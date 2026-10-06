import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Course } from '../types';
import { Award, CheckCircle2, XCircle, ArrowRight, ShieldCheck, Clock, RefreshCw } from 'lucide-react';

export const ExamPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [answers, setAnswers] = useState<number[]>([ -1, -1, -1, -1, -1 ]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/courses/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setCourse(data.course);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleOptionSelect = (qIndex: number, optionIndex: number) => {
    const updated = [...answers];
    updated[qIndex] = optionIndex;
    setAnswers(updated);
  };

  const handleSubmitExam = async () => {
    if (answers.some(a => a === -1)) {
      alert('Please answer all 5 questions before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${id}/submit-exam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ answers })
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
      } else {
        alert(data.error || 'Submission failed.');
      }
    } catch (err: any) {
      alert('Error submitting exam.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <span>Loading exam questions...</span>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="py-20 text-center text-slate-300">
        <p>Course not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6">
      
      {/* Exam Header */}
      <div className="glass-panel p-6 rounded-3xl border border-indigo-500/20 flex items-center justify-between">
        <div>
          <span className="text-xs font-mono text-indigo-400 font-semibold uppercase">Exam Assessment</span>
          <h1 className="text-2xl font-bold text-white font-outfit mt-0.5">{course.title}</h1>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400 block font-mono">Passing Score</span>
          <span className="text-sm font-bold text-emerald-400 font-mono">80% (4 / 5 Correct)</span>
        </div>
      </div>

      {/* Result View */}
      {result ? (
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 space-y-6 text-center">
          {result.passed ? (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              
              <h2 className="text-3xl font-extrabold text-white font-outfit">Congratulations! You Passed!</h2>
              
              <p className="text-slate-300 text-sm max-w-md mx-auto">
                You scored <strong className="text-emerald-400 font-mono text-base">{result.score}%</strong> ({result.correctCount} out of 5 correct).
              </p>

              <div className="glass-card p-6 rounded-2xl border border-cyan-500/30 max-w-lg mx-auto text-left space-y-3">
                <div className="flex items-center space-x-2 text-cyan-400">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="font-bold text-sm">Hyperledger Fabric Certificate Initiated</span>
                </div>
                <div className="text-xs text-slate-400 space-y-1 font-mono">
                  <div>Certificate ID: <span className="text-white font-semibold">{result.certificateId}</span></div>
                  <div>Student Sign-off: <span className="text-emerald-400">✓ Signed</span></div>
                  <div>Status: <span className="text-amber-400">PENDING_TEACHER_APPROVAL</span></div>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <Link
                  to={`/verify/${result.certificateId}`}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-cyan-600/30 hover:scale-[1.02] transition-transform flex items-center space-x-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>View & Share Recruiter Verification</span>
                </Link>

                <Link
                  to="/student"
                  className="px-6 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-medium text-sm hover:text-white transition-all"
                >
                  Return to Dashboard
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-white font-outfit">Score: {result.score}%</h2>
              <p className="text-slate-400 text-sm">
                You got {result.correctCount} out of 5 questions correct. An 80% score (4 out of 5) is required to issue a certificate.
              </p>
              
              <button
                onClick={() => {
                  setResult(null);
                  setAnswers([-1, -1, -1, -1, -1]);
                }}
                className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm shadow-lg hover:bg-indigo-500 transition-all inline-flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retake Exam</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Questions List */
        <div className="space-y-6">
          {course.questions.map((q, qIndex) => (
            <div key={q.id || qIndex} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-mono font-bold">
                  Q{qIndex + 1}
                </span>
                <h3 className="text-base font-semibold text-white leading-snug flex-1">{q.question}</h3>
              </div>

              <div className="space-y-2.5 pt-2">
                {q.options.map((option, optIndex) => {
                  const isSelected = answers[qIndex] === optIndex;
                  return (
                    <button
                      key={optIndex}
                      onClick={() => handleOptionSelect(qIndex, optIndex)}
                      className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-white font-medium shadow-md shadow-indigo-500/10'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <span>{option}</span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-indigo-400 bg-indigo-500' : 'border-slate-700'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Submit Button */}
          <div className="pt-4 flex justify-end">
            <button
              onClick={handleSubmitExam}
              disabled={submitting || answers.some(a => a === -1)}
              className={`px-8 py-4 rounded-xl font-bold text-sm transition-all flex items-center space-x-2 ${
                answers.some(a => a === -1)
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-600/30 hover:scale-[1.02]'
              }`}
            >
              {submitting ? (
                <span>Evaluating Exam & Minting Signature...</span>
              ) : (
                <>
                  <span>Submit Exam Answers</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
