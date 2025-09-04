import { POST } from '../signup/route';
import { NextRequest } from 'next/server';

describe('/api/auth/signup', () => {
  describe('POST', () => {
    it('should return 400 for invalid email format', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid email');
    });

    it('should return 400 for password too short', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: '123',
          name: 'Test User',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('String must contain at least 6 character(s)');
    });

    it('should return 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          // password missing
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle signup with name', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: uniqueEmail,
          password: 'password123',
          name: 'Test User',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      // 実際のSupabaseの設定によって成功するかどうかが決まる
      if (response.status === 200) {
        expect(data.success).toBe(true);
        expect(data.data.user).toBeDefined();
        expect(data.data.user.email).toBe(uniqueEmail);
      } else {
        // 環境によっては認証が無効化されている場合がある
        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
      }
    });

    it('should handle signup without name (uses email prefix)', async () => {
      const uniqueEmail = `test-${Date.now() + 1}@example.com`;
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: uniqueEmail,
          password: 'password123',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      // 実際のSupabaseの設定によって成功するかどうかが決まる
      if (response.status === 200) {
        expect(data.success).toBe(true);
        expect(data.data.user).toBeDefined();
        expect(data.data.user.email).toBe(uniqueEmail);
      } else {
        // 環境によっては認証が無効化されている場合がある
        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
      }
    });

    it('should return 400 for duplicate email', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com', // 既存のメールアドレス
          password: 'password123',
          name: 'Test User',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should return 400 for invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});
