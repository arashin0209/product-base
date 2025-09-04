require('@testing-library/jest-dom');

// Load actual environment variables from .env.local
const { config } = require('dotenv');
config({ path: '.env.local' });

// Use actual environment variables for testing
console.log('Jest setup - Environment variables loaded:', {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET'
});
