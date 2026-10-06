import { Router, Response } from 'express';
import crypto from 'crypto';
import { authenticateJWT, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { Course, Enrollment } from '../types';
import { fabricGatewayService } from '../services/fabricGateway';

const router = Router();

// Seed Sample Courses for immediate demonstration
export const coursesStore: Course[] = [
  {
    id: 'CRS-501',
    title: 'Introduction to Blockchain & Hyperledger Fabric Architecture',
    category: 'Blockchain & Cryptography',
    description: 'Master enterprise permissioned ledgers, smart contract (chaincode) development, multi-party signature agreements, and immutable verification systems.',
    teacherId: 'TCH-201',
    teacherName: 'Prof. Michael Faraday',
    content: `Hyperledger Fabric is an open-source enterprise-grade permissioned distributed ledger technology (DLT) platform. Unlike public blockchains like Ethereum or Bitcoin, Hyperledger Fabric uses a pluggable consensus model and role-based access control.

Certificates stored on Hyperledger Fabric benefit from cryptographic immutability, state provenance, and multi-party signature requirements. In a multi-party consensus model, a certificate is initiated by the student upon achieving a passing grade on the course exam. 

To ensure complete trust and prevent fraudulent credential inflation, the certificate asset must be co-signed by both the Course Instructor (Academic Authority) and the Platform Super-Admin (Issuing Provider Authority, such as edX or Coursera). Once all three signatures (Student + Teacher + Platform Admin) are cryptographically validated by the chaincode, the certificate transitions to ISSUED_VALID status on the ledger. Recruiter verification portals can then query the immutable ledger history to audit every transaction hash and timestamp without needing manual verification from university registrars.`,
    questions: [
      {
        id: 'q1',
        question: 'What distinguishes Hyperledger Fabric from public blockchains like Ethereum?',
        options: [
          'Enterprise permissioned governance and pluggable consensus',
          'Slow transaction speeds and high gas fees',
          'Lack of smart contract support',
          'Public anonymous mining nodes'
        ],
        correctAnswerIndex: 0
      },
      {
        id: 'q2',
        question: 'What threshold of signatures is required for a certificate to reach ISSUED_VALID status?',
        options: [
          '3-Way Multi-Party Signatures (Student + Teacher + Platform Super-Admin)',
          'Only a student self-signature',
          'No signatures required',
          'A single anonymous automated bot'
        ],
        correctAnswerIndex: 0
      },
      {
        id: 'q3',
        question: 'What happens when a student passes the 5-question exam with an 80%+ score?',
        options: [
          'The draft certificate is initiated on Fabric with status PENDING_TEACHER_APPROVAL',
          'The certificate is immediately published without any teacher review',
          'The student is automatically failed',
          'A physical paper diploma is mailed'
        ],
        correctAnswerIndex: 0
      },
      {
        id: 'q4',
        question: 'How do recruiters verify the authenticity of a student certificate?',
        options: [
          'By querying the public verification portal directly against the Fabric ledger state',
          'By calling the university phone registry during office hours',
          'By inspecting unverified paper screenshots',
          'By asking the student for a cash deposit'
        ],
        correctAnswerIndex: 0
      },
      {
        id: 'q5',
        question: 'What cryptographic hash algorithm is used to guarantee exam completion proof?',
        options: [
          'SHA-256',
          'MD5',
          'Plaintext ROT13',
          'Base64 encoding'
        ],
        correctAnswerIndex: 0
      }
    ],
    createdAt: new Date().toISOString()
  }
];

export const enrollmentsStore: Enrollment[] = [
  {
    id: 'ENR-1001',
    studentId: 'STD-101',
    courseId: 'CRS-501',
    enrolledAt: new Date().toISOString(),
    completed: true,
    score: 100,
    certificateId: 'CERT-2026-1001'
  }
];

// List All Courses
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  return res.json({ success: true, courses: coursesStore });
});

// Get Single Course by ID
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const course = coursesStore.find(c => c.id === req.params.id);
  if (!course) {
    return res.status(404).json({ success: false, error: 'Course not found.' });
  }
  return res.json({ success: true, course });
});

// Create New Course (Teacher or Super-Admin only)
router.post('/', authenticateJWT, requireRole('TEACHER', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { title, description, category, content, questions } = req.body;

  if (!title || !content || !questions || questions.length !== 5) {
    return res.status(400).json({ 
      success: false, 
      error: 'Please provide course title, content text, and 5 multiple choice questions.' 
    });
  }

  const newCourse: Course = {
    id: 'CRS-' + Math.floor(100 + Math.random() * 900),
    title,
    description: description || title,
    category: category || 'General Computer Science',
    teacherId: req.user!.id,
    teacherName: req.user!.name,
    content,
    questions,
    createdAt: new Date().toISOString()
  };

  coursesStore.push(newCourse);
  return res.status(201).json({ success: true, course: newCourse });
});

// Enroll Student in Course
router.post('/:id/enroll', authenticateJWT, requireRole('STUDENT'), (req: AuthenticatedRequest, res: Response) => {
  const courseId = req.params.id;
  const studentId = req.user!.id;

  const existing = enrollmentsStore.find(e => e.studentId === studentId && e.courseId === courseId);
  if (existing) {
    return res.json({ success: true, enrollment: existing, message: 'Already enrolled.' });
  }

  const newEnrollment: Enrollment = {
    id: 'ENR-' + Math.floor(1000 + Math.random() * 9000),
    studentId,
    courseId,
    enrolledAt: new Date().toISOString(),
    completed: false
  };

  enrollmentsStore.push(newEnrollment);
  return res.json({ success: true, enrollment: newEnrollment });
});

// Get Student Enrollments
router.get('/student/my-enrollments', authenticateJWT, requireRole('STUDENT'), (req: AuthenticatedRequest, res: Response) => {
  const studentId = req.user!.id;
  const studentEnrollments = enrollmentsStore.filter(e => e.studentId === studentId);
  const enrolledCourses = studentEnrollments.map(e => {
    const course = coursesStore.find(c => c.id === e.courseId);
    return { ...e, course };
  });

  return res.json({ success: true, enrollments: enrolledCourses });
});

// Submit Course Exam
router.post('/:id/submit-exam', authenticateJWT, requireRole('STUDENT'), async (req: AuthenticatedRequest, res: Response) => {
  const courseId = req.params.id;
  const { answers } = req.body; // Array of selected option indices e.g. [0, 0, 0, 0, 0]

  const course = coursesStore.find(c => c.id === courseId);
  if (!course) {
    return res.status(404).json({ success: false, error: 'Course not found.' });
  }

  if (!answers || !Array.isArray(answers) || answers.length !== course.questions.length) {
    return res.status(400).json({ success: false, error: 'Please answer all 5 questions.' });
  }

  // Calculate score
  let correctCount = 0;
  course.questions.forEach((q, idx) => {
    if (answers[idx] === q.correctAnswerIndex) {
      correctCount++;
    }
  });

  const percentageScore = (correctCount / course.questions.length) * 100;
  const passed = percentageScore >= 80;

  let certificateResult = null;
  let certId = '';

  if (passed) {
    certId = 'CERT-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000);
    const completionHash = crypto.createHash('sha256')
      .update(`${req.user!.id}-${courseId}-${percentageScore}-${Date.now()}`)
      .digest('hex');

    try {
      certificateResult = await fabricGatewayService.initiateCertificate({
        certificateId: certId,
        studentId: req.user!.id,
        studentName: req.user!.name,
        courseId,
        courseTitle: course.title,
        teacherId: course.teacherId,
        teacherName: course.teacherName,
        score: percentageScore,
        completionHash
      });

      // Update Enrollment status
      let enrollment = enrollmentsStore.find(e => e.studentId === req.user!.id && e.courseId === courseId);
      if (!enrollment) {
        enrollment = {
          id: 'ENR-' + Math.floor(1000 + Math.random() * 9000),
          studentId: req.user!.id,
          courseId,
          enrolledAt: new Date().toISOString(),
          completed: true,
          score: percentageScore,
          certificateId: certId
        };
        enrollmentsStore.push(enrollment);
      } else {
        enrollment.completed = true;
        enrollment.score = percentageScore;
        enrollment.certificateId = certId;
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.json({
    success: true,
    score: percentageScore,
    correctCount,
    totalQuestions: course.questions.length,
    passed,
    certificateId: certId || undefined,
    certificateResult
  });
});

export default router;
