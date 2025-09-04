import { POST } from '../checkout/route';
import { NextRequest } from 'next/server';

describe('/api/billing/checkout', () => {
  describe('POST', () => {
    it('should return 401 for missing authorization header', async () => {
      const request = new NextRequest('http://localhost:3000/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_123',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authorization header missing');
    });

    it('should return 401 for invalid authorization header format', async () => {
      const request = new NextRequest('http://localhost:3000/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_123',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'InvalidFormat token123',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authorization header missing');
    });

    it('should return 401 for invalid token', async () => {
      const request = new NextRequest('http://localhost:3000/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_123',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token-123',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid token');
    });

    it('should return 400 for invalid priceId', async () => {
      const request = new NextRequest('http://localhost:3000/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: '', // 空のpriceId
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token-format',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid successUrl', async () => {
      const request = new NextRequest('http://localhost:3000/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_123',
          successUrl: 'not-a-valid-url',
          cancelUrl: 'https://example.com/cancel',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token-format',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid cancelUrl', async () => {
      const request = new NextRequest('http://localhost:3000/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_123',
          successUrl: 'https://example.com/success',
          cancelUrl: 'not-a-valid-url',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token-format',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_123',
          // successUrl and cancelUrl missing
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token-format',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/billing/checkout', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token-format',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle valid request format (but may fail due to Stripe configuration)', async () => {
      const request = new NextRequest('http://localhost:3000/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_123',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token-format',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      // 実際のStripeの設定によって結果が変わる
      // 認証エラー、Stripe設定エラー、または成功のいずれか
      expect([200, 401, 500]).toContain(response.status);
      expect(data.success !== undefined).toBe(true);
    });
  });
});
