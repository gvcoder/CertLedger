import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { Question } from '../types';

export async function generateAIQuestions(courseTitle: string, courseText: string): Promise<Question[]> {
  if (config.geminiApiKey) {
    try {
      const genAI = new GoogleGenerativeAI(config.geminiApiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `You are an expert exam creator. Given the following course title and content text, generate EXACTLY 5 multiple-choice questions to test student comprehension.
      
Course Title: ${courseTitle}
Course Text:
${courseText}

Respond ONLY with a valid JSON array of 5 objects matching this exact structure:
[
  {
    "id": "q1",
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswerIndex": 0
  }
]
No markdown formatting, no code fences, only raw JSON.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text() || '';
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const questions: Question[] = JSON.parse(cleanJson);
      
      if (Array.isArray(questions) && questions.length === 5) {
        return questions;
      }
    } catch (err) {
      console.warn('⚠️ Gemini AI API call failed or parsing error. Falling back to smart question generator:', err);
    }
  }

  // Smart Heuristic Fallback Generator when Gemini API Key is missing or fails
  return fallbackQuestionGenerator(courseTitle, courseText);
}

function fallbackQuestionGenerator(title: string, text: string): Question[] {
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15);
  
  return [
    {
      id: 'q1',
      question: `What is the primary focus of the course "${title}"?`,
      options: [
        `Understanding key principles outlined in ${title}`,
        'Learning basic web browsing techniques',
        'Exploring unrelated legacy database tools',
        'Memorizing static historical dates'
      ],
      correctAnswerIndex: 0
    },
    {
      id: 'q2',
      question: sentences[0] ? `Based on the course reading: What key concept is highlighted? "${sentences[0].substring(0, 60)}..."` : 'Which role is responsible for issuing verified credentials in this architecture?',
      options: [
        sentences[0] ? sentences[0].substring(0, 45) : 'Hyperledger Fabric Smart Contract & Authorized Signers',
        'Random unauthenticated third parties',
        'Manual legacy paper registry',
        'Temporary browser cookies'
      ],
      correctAnswerIndex: 0
    },
    {
      id: 'q3',
      question: 'How does Hyperledger Fabric ensure certificate immutability and anti-tampering?',
      options: [
        'By storing SHA-256 completion hashes and multi-party signatures in a distributed cryptographic ledger',
        'By storing plaintext spreadsheet files on a local desktop',
        'By allowing any user to edit certificate history anytime',
        'By relying on non-secure email attachments'
      ],
      correctAnswerIndex: 0
    },
    {
      id: 'q4',
      question: 'What is required for a certificate asset to reach the "ISSUED_VALID" status in this system?',
      options: [
        'Multi-party sign-off from Student, Teacher, and Platform Super-Admin',
        'Only a single student self-assessment check',
        'No approval or signature from any party',
        'Passing an optional survey without taking an exam'
      ],
      correctAnswerIndex: 0
    },
    {
      id: 'q5',
      question: 'How can external recruiters verify the authenticity of a student’s earned certificate?',
      options: [
        'By looking up the certificate ID on the public verification portal to check state & signature proof',
        'By requesting a manual fax copy from the university',
        'By trusting unverified claims on social media',
        'By querying a central private spreadsheet'
      ],
      correctAnswerIndex: 0
    }
  ];
}
