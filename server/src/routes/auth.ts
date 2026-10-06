import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User } from '../types';

const router = Router();

// In-memory User Store pre-seeded for testing
export const usersStore: User[] = [
  {
    id: 'SUPER-ADMIN-01',
    name: 'Dr. Arthur Pendelton (EdX Admin)',
    email: 'admin@edx.org',
    role: 'SUPER_ADMIN',
    institution: 'EdX Platform Global Provider',
    createdAt: new Date().toISOString()
  },
  {
    id: 'TCH-201',
    name: 'Prof. Michael Faraday',
    email: 'teacher@university.edu',
    role: 'TEACHER',
    institution: 'MIT Department of Computer Science',
    createdAt: new Date().toISOString()
  },
  {
    id: 'STD-101',
    name: 'Alex Rivera',
    email: 'student@mit.edu',
    role: 'STUDENT',
    institution: 'MIT',
    createdAt: new Date().toISOString()
  }
];

// Login or Quick Register Endpoint
router.post('/login', (req: Request, res: Response) => {
  const { email, role, name, institution } = req.body;

  let user = usersStore.find(u => u.email.toLowerCase() === email?.toLowerCase());

  if (!user && role) {
    // Register new user dynamically
    const prefix = role === 'TEACHER' ? 'TCH-' : role === 'SUPER_ADMIN' ? 'ADM-' : 'STD-';
    user = {
      id: prefix + Math.floor(1000 + Math.random() * 9000),
      name: name || email.split('@')[0].toUpperCase(),
      email,
      role,
      institution: institution || (role === 'TEACHER' ? 'Academic Faculty' : role === 'SUPER_ADMIN' ? 'EdX Platform Provider' : 'University Scholar'),
      createdAt: new Date().toISOString()
    };
    usersStore.push(user);
  }

  if (!user) {
    return res.status(400).json({ success: false, error: 'User not found. Please register or select a role.' });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, institution: user.institution },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

  return res.json({
    success: true,
    token,
    user
  });
});

// Explicit Register Endpoint
router.post('/register', (req: Request, res: Response) => {
  const { name, email, role, institution } = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({ success: false, error: 'Name, email, and role are required.' });
  }

  let user = usersStore.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (user) {
    return res.status(400).json({ success: false, error: 'User with this email already exists. Please log in.' });
  }

  const prefix = role === 'TEACHER' ? 'TCH-' : role === 'SUPER_ADMIN' ? 'ADM-' : 'STD-';
  user = {
    id: prefix + Math.floor(1000 + Math.random() * 9000),
    name,
    email,
    role,
    institution: institution || (role === 'TEACHER' ? 'Academic Faculty' : 'University Scholar'),
    createdAt: new Date().toISOString()
  };
  usersStore.push(user);

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, institution: user.institution },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

  return res.json({
    success: true,
    token,
    user
  });
});

// Get Current User Profile Endpoint
router.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ success: false });

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    const user = usersStore.find(u => u.id === decoded.id) || decoded;
    return res.json({ success: true, user });
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid token.' });
  }
});

// List All Users
router.get('/users', (req: Request, res: Response) => {
  return res.json({ success: true, users: usersStore });
});

export default router;
