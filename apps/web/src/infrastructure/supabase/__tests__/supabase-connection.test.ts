import { supabase } from '../supabase.client';

describe('Supabase Connection Test', () => {
  it('should connect to Supabase and fetch users', async () => {
    console.log('Environment variables:', {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'
    });

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    console.log('Supabase connection test result:', { data, error });

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Supabase connection failed: ${error.message}`);
    }

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should connect to Supabase and fetch plans', async () => {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .limit(1);

    console.log('Supabase plans test result:', { data, error });

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Supabase connection failed: ${error.message}`);
    }

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
  });
});
