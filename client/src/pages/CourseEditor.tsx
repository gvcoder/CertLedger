import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Question } from '../types';
import { Sparkles, ArrowLeft, Plus, Trash2, CheckCircle2, Save } from 'lucide-react';

export const CourseEditor: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Blockchain & Cryptography');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);

  const [questions, setQuestions] = useState<Question[]>([
    { id: 'q1', question: '', options: ['', '', '', ''], correctAnswerIndex: 0 },
    { id: 'q2', question: '', options: ['', '', '', ''], correctAnswerIndex: 0 },
    { id: 'q3', question: '', options: ['', '', '', ''], correctAnswerIndex: 0 },
    { id: 'q4', question: '', options: ['', '', '', ''], correctAnswerIndex: 0 },
    { id: 'q5', question: '', options: ['', '', '', ''], correctAnswerIndex: 0 },
  ]);

  const handleGenerateAIQuestions = async () => {
    if (!title || !content) {
      alert('Please enter Course Title and Course Reading Content first before generating AI questions.');
      return;
    }

    setGeneratingAI(true);
    try {
      const res = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title, text: content })
      });
      const data = await res.json();
      if (data.success && data.questions?.length === 5) {
        setQuestions(data.questions);
        alert('✨ Gemini AI successfully generated 5 assessment questions from your course text!');
      } else {
        alert(data.error || 'Failed to generate questions.');
      }
    } catch (err) {
      alert('AI Generation encountered an error.');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleQuestionChange = (qIndex: number, field: string, value: any) => {
    const updated = [...questions];
    (updated[qIndex] as any)[field] = value;
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = value;
    setQuestions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !content) {
      alert('Title and Content text are required.');
      return;
    }

    // Check if questions are valid
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].question || questions[i].options.some(o => !o.trim())) {
        alert(`Question ${i + 1} and all 4 of its options must be filled out.`);
        return;
      }
    }

    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          category,
          description: description || title,
          content,
          questions
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Course successfully published!');
        navigate('/teacher');
      } else {
        alert(data.error || 'Failed to publish course.');
      }
    } catch (err) {
      alert('Error creating course.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      
      <button onClick={() => navigate('/teacher')} className="inline-flex items-center space-x-2 text-sm text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Teacher Workspace</span>
      </button>

      <div className="glass-panel p-8 rounded-3xl border border-purple-500/20">
        <h1 className="text-2xl font-bold text-white font-outfit">Create New Course & Assessment</h1>
        <p className="text-xs text-slate-400 mt-1">Provide reading text and use AI to generate 5 multiple choice exam questions.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Course Details */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-lg font-bold text-white font-outfit">Course Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Course Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Introduction to Smart Contract Security"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Category</label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="e.g. Computer Science"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Short Summary</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief course overview..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">1-Page Course Reading Material (Text) *</label>
            <textarea
              required
              rows={8}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Paste or write the 1-page learning text here..."
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none leading-relaxed font-sans"
            />
          </div>
        </div>

        {/* AI Exam Questions Generator Section */}
        <div className="glass-panel p-6 rounded-2xl border border-purple-500/30 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white font-outfit flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                5-Question Multiple Choice Assessment
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Generate automatically using Gemini AI or edit manually below.</p>
            </div>

            <button
              type="button"
              onClick={handleGenerateAIQuestions}
              disabled={generatingAI}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-xs shadow-md shadow-purple-600/30 hover:scale-[1.02] transition-transform flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4 text-cyan-300" />
              <span>{generatingAI ? 'Gemini AI Generating Questions...' : 'Use AI to Generate Questions'}</span>
            </button>
          </div>

          {/* Question Forms */}
          <div className="space-y-6">
            {questions.map((q, qIndex) => (
              <div key={qIndex} className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-purple-400">Question {qIndex + 1}</span>
                  <div className="flex items-center space-x-2 text-xs text-slate-400">
                    <span>Correct Answer Option:</span>
                    <select
                      value={q.correctAnswerIndex}
                      onChange={e => handleQuestionChange(qIndex, 'correctAnswerIndex', parseInt(e.target.value))}
                      className="bg-slate-950 border border-slate-800 text-emerald-400 rounded-md px-2 py-1 font-mono font-bold text-xs"
                    >
                      <option value={0}>Option A (Index 0)</option>
                      <option value={1}>Option B (Index 1)</option>
                      <option value={2}>Option C (Index 2)</option>
                      <option value={3}>Option D (Index 3)</option>
                    </select>
                  </div>
                </div>

                <input
                  type="text"
                  required
                  value={q.question}
                  onChange={e => handleQuestionChange(qIndex, 'question', e.target.value)}
                  placeholder={`Enter question ${qIndex + 1}...`}
                  className="w-full px-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm focus:border-purple-500 focus:outline-none font-medium"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                  {q.options.map((opt, optIndex) => (
                    <div key={optIndex} className="flex items-center space-x-2">
                      <span className={`text-xs font-mono w-6 text-center ${q.correctAnswerIndex === optIndex ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                        {String.fromCharCode(65 + optIndex)}.
                      </span>
                      <input
                        type="text"
                        required
                        value={opt}
                        onChange={e => handleOptionChange(qIndex, optIndex, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                        className={`w-full px-3 py-1.5 rounded-lg bg-slate-950 border text-xs focus:outline-none ${
                          q.correctAnswerIndex === optIndex ? 'border-emerald-500/50 text-white' : 'border-slate-800 text-slate-300'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 hover:scale-[1.02] transition-transform flex items-center space-x-2"
          >
            <Save className="w-5 h-5" />
            <span>Publish Course</span>
          </button>
        </div>

      </form>

    </div>
  );
};
