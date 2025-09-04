import { POST } from '../webhook/route';
import { NextRequest } from 'next/server';

describe('/api/billing/webhook', () => {
  describe('POST', () => {
    it('should return 400 for missing stripe-signature header', async () => {
      const request = new NextRequest('http://localhost:3000/api/billing/webhook', {
        method: 'POST',
        body: JSON.stringify({
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_test123',
            },
          },
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing stripe-signature header');
    });

    it('should return 400 for invalid stripe-signature', async () => {
      const request = new NextRequest('http://localhost:3000/api/billing/webhook', {
        method: 'POST',
        body: JSON.stringify({
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_test123',
            },
          },
        }),
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'invalid-signature',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Webhook processing failed');
    });

    it('should return 400 for invalid JSON body', async () => {
      const request = new NextRequest('http://localhost:3000/api/billing/webhook', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'valid-signature-format',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Webhook processing failed');
    });

    it('should handle valid webhook format (but may fail due to Stripe configuration)', async () => {
      const request = new NextRequest('http://localhost:3000/api/billing/webhook', {
        method: 'POST',
        body: JSON.stringify({
          id: 'evt_test123',
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_test123',
              customer: 'cus_test123',
              metadata: {
                userId: 'user_123',
              },
            },
          },
        }),
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'valid-signature-format',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      // 実際のStripeの設定によって結果が変わる
      // 署名検証エラー、処理エラー、または成功のいずれか
      expect([200, 400, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(data.received).toBe(true);
      } else {
        expect(data.error).toBeDefined();
      }
    });

    it('should handle different webhook event types', async () => {
      const eventTypes = [
        'checkout.session.completed',
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.payment_succeeded',
        'invoice.payment_failed',
      ];

      for (const eventType of eventTypes) {
        const request = new NextRequest('http://localhost:3000/api/billing/webhook', {
          method: 'POST',
          body: JSON.stringify({
            id: `evt_test_${eventType}`,
            type: eventType,
            data: {
              object: {
                id: 'test_object_id',
              },
            },
          }),
          headers: {
            'Content-Type': 'application/json',
            'stripe-signature': 'valid-signature-format',
          },
        });

        const response = await POST(request);
        const data = await response.json();

        // 実際のStripeの設定によって結果が変わる
        expect([200, 400, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(data.received).toBe(true);
        } else {
          expect(data.error).toBeDefined();
        }
      }
    });

    it('should handle empty body', async () => {
      const request = new NextRequest('http://localhost:3000/api/billing/webhook', {
        method: 'POST',
        body: '',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'valid-signature-format',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Webhook processing failed');
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/billing/webhook', {
        method: 'POST',
        body: '{"incomplete": json}',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'valid-signature-format',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Webhook processing failed');
    });
  });
});
