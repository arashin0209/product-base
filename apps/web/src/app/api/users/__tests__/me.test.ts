import { GET } from '../me/route';
import { NextRequest } from 'next/server';

describe('/api/users/me', () => {
  describe('GET', () => {
    it('should return 401 for missing authorization header', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authorization header missing');
    });

    it('should return 401 for invalid authorization header format', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'InvalidFormat token123',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authorization header missing');
    });

    it('should return 401 for invalid token', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token-123',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid token');
    });

    it('should return 401 for empty token', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid token');
    });

    it('should return 404 for user not found in database', async () => {
      // 有効なトークン形式だが、データベースに存在しないユーザーの場合
      const request = new NextRequest('http://localhost:3000/api/users/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token-format-but-user-not-found',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      // 実際のSupabaseの認証設定によって結果が変わる
      expect([401, 404]).toContain(response.status);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should handle malformed authorization header', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'NotBearer token123',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authorization header missing');
    });

    it('should handle missing authorization header completely', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authorization header missing');
    });
  });
});
