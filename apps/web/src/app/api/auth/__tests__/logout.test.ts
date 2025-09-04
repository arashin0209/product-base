import { POST } from '../logout/route';
import { NextRequest } from 'next/server';

describe('/api/auth/logout', () => {
  describe('POST', () => {
    it('should logout successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('Logged out successfully');
    });

    it('should handle logout even without session', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      // ログアウトは通常成功する（セッションがなくても）
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
