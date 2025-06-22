import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { createClient } from '@supabase/supabase-js';
import { authMiddleware } from './middleware/auth.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Cookie Parser middleware
app.use(cookieParser());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN/*?.split(',')*/ || 'http://localhost:3000',
  credentials: true,
  // methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  // allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Initialize Supabase client
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Import routes
import healthCheckRoutes from './routes/healthCheck.js';
import userRoutes from './routes/user.js';
import authRoutes from './routes/auth.js';
import testRoutes from './routes/test.js';

// Public routes (no authentication required)
app.use('/', healthCheckRoutes);
app.use('/auth', authRoutes);

// Apply authentication middleware for all routes below this line
app.use(authMiddleware);

// Protected routes (require authentication)
app.use('/user', userRoutes);
app.use('/test', testRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});