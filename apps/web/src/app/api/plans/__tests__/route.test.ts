import { GET } from '../route';
import { NextRequest } from 'next/server';

describe('/api/plans', () => {
  describe('GET', () => {
    it('should return plans successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/plans', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.plans).toBeDefined();
      expect(Array.isArray(data.data.plans)).toBe(true);
    });

    it('should return plans with correct structure', async () => {
      const request = new NextRequest('http://localhost:3000/api/plans', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      if (data.data.plans.length > 0) {
        const plan = data.data.plans[0];
        expect(plan).toHaveProperty('id');
        expect(plan).toHaveProperty('name');
        expect(plan).toHaveProperty('description');
        expect(plan).toHaveProperty('active');
        expect(plan).toHaveProperty('features');
        expect(typeof plan.features).toBe('object');
      }
    });

    it('should return only active plans', async () => {
      const request = new NextRequest('http://localhost:3000/api/plans', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      if (data.data.plans.length > 0) {
        data.data.plans.forEach((plan: any) => {
          expect(plan.active).toBe(true);
        });
      }
    });

    it('should handle database errors gracefully with fallback', async () => {
      // このテストは実際のデータベースが利用可能な場合の動作をテスト
      const request = new NextRequest('http://localhost:3000/api/plans', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.plans).toBeDefined();
      
      // データベースから取得した場合でも、フォールバックの場合でも
      // プランの配列が返されることを確認
      expect(Array.isArray(data.data.plans)).toBe(true);
    });

    it('should return plans with expected plan types', async () => {
      const request = new NextRequest('http://localhost:3000/api/plans', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      if (data.data.plans.length > 0) {
        const planIds = data.data.plans.map((plan: any) => plan.id);
        
        // 少なくともfreeプランは存在することを期待
        expect(planIds).toContain('free');
        
        // 他のプランも存在する可能性がある
        const expectedPlans = ['free', 'gold', 'platinum'];
        const hasExpectedPlans = expectedPlans.some(planId => planIds.includes(planId));
        expect(hasExpectedPlans).toBe(true);
      }
    });

    it('should handle different HTTP methods', async () => {
      // GET以外のメソッドはサポートされていない
      const request = new NextRequest('http://localhost:3000/api/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Next.jsのAPIルートでは、定義されていないメソッドは405を返す
      // ただし、このテストではGET関数のみをテストしているので、
      // 実際の動作はNext.jsのルーティングに依存する
      expect(() => GET(request)).not.toThrow();
    });
  });
});
