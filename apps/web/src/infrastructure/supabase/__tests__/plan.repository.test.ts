import { PlanRepository } from '../plan.repository';
import { supabase } from '../supabase.client';
import { Plan } from '@/domain/plan/plan.entity';
import { NotFoundError } from '@/shared/errors';

// Supabaseクライアントをモック
const mockSingle = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockSelect = jest.fn();
const mockInsert = jest.fn(() => ({ select: jest.fn(() => ({ single: mockSingle })) }));
const mockUpdate = jest.fn(() => ({ eq: jest.fn(() => ({ select: jest.fn(() => ({ single: mockSingle })) })) }));
const mockDelete = jest.fn(() => ({ eq: jest.fn() }));

jest.mock('../supabase.client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    })),
  },
}));

describe('PlanRepository', () => {
  let planRepository: PlanRepository;
  let mockSupabase: any;

  beforeEach(() => {
    planRepository = new PlanRepository();
    mockSupabase = supabase as any;
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a plan when found', async () => {
      const mockPlanData = {
        id: 'gold',
        name: 'Gold Plan',
        description: 'Premium features included',
        features: { ai_requests: true, export_csv: true },
        stripe_price_id: 'price_123',
        active: true,
      };

      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockPlanData,
            error: null,
          }),
        }),
      });

      const result = await planRepository.findById('gold');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeInstanceOf(Plan);
        expect(result.data.id).toBe('gold');
        expect(result.data.name).toBe('Gold Plan');
        expect(result.data.canUse('ai_requests')).toBe(true);
      }
    });

    it('should return NotFoundError when plan not found', async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        }),
      });

      const result = await planRepository.findById('non-existent');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(NotFoundError);
        expect(result.error.message).toBe('Plan not found');
      }
    });
  });

  describe('findAll', () => {
    it('should return all active plans', async () => {
      const mockPlansData = [
        {
          id: 'free',
          name: 'Free Plan',
          description: 'Basic features',
          features: { ai_requests: false, export_csv: false },
          stripe_price_id: null,
          active: true,
        },
        {
          id: 'gold',
          name: 'Gold Plan',
          description: 'Premium features',
          features: { ai_requests: true, export_csv: true },
          stripe_price_id: 'price_123',
          active: true,
        },
      ];

      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockPlansData,
            error: null,
          }),
        }),
      });

      const result = await planRepository.findAll();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0]).toBeInstanceOf(Plan);
        expect(result.data[0].id).toBe('free');
        expect(result.data[1].id).toBe('gold');
      }
    });

    it('should return empty array when no plans found', async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const result = await planRepository.findAll();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });
  });

  describe('create', () => {
    it('should create a new plan successfully', async () => {
      const mockPlanData = {
        id: 'platinum',
        name: 'Platinum Plan',
        description: 'All features included',
        features: { ai_requests: true, export_csv: true, custom_theme: true },
        limits: { max_projects: 100 },
        stripe_price_id: 'price_456',
        active: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockSingle.mockResolvedValue({
        data: mockPlanData,
        error: null,
      });

      const result = await planRepository.create({
        id: 'platinum',
        name: 'Platinum Plan',
        description: 'All features included',
        features: { ai_requests: true, export_csv: true, custom_theme: true },
        stripePriceId: 'price_456',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeInstanceOf(Plan);
        expect(result.data.id).toBe('platinum');
        expect(result.data.name).toBe('Platinum Plan');
        expect(result.data.canUse('custom_theme')).toBe(true);
      }
    });

    it('should return error when creation fails due to duplicate ID', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'duplicate key value violates unique constraint "plans_pkey"' },
      });

      const result = await planRepository.create({
        id: 'free', // 既存のID
        name: 'Duplicate Plan',
        description: 'This should fail',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('duplicate key');
      }
    });

    it('should return error when creation fails due to validation error', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'new row for relation "plans" violates check constraint' },
      });

      const result = await planRepository.create({
        id: 'invalid',
        name: '', // 空の名前（NOT NULL制約違反）
        description: 'This should fail',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('violates check constraint');
      }
    });
  });

  describe('update', () => {
    it('should update plan successfully', async () => {
      const mockPlanData = {
        id: 'gold',
        name: 'Updated Gold Plan',
        description: 'Updated description',
        features: { ai_requests: true, export_csv: true, priority_support: true },
        limits: { max_projects: 50 },
        stripe_price_id: 'price_789',
        active: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T12:00:00Z',
      };

      mockSingle.mockResolvedValue({
        data: mockPlanData,
        error: null,
      });

      const result = await planRepository.update('gold', {
        name: 'Updated Gold Plan',
        description: 'Updated description',
        features: { ai_requests: true, export_csv: true, priority_support: true },
        stripePriceId: 'price_789',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Updated Gold Plan');
        expect(result.data.canUse('priority_support')).toBe(true);
      }
    });

    it('should return error when updating non-existent plan', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const result = await planRepository.update('non-existent', {
        name: 'Updated Plan',
        description: 'Updated description',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('No rows found');
      }
    });

    it('should return error when update fails due to validation error', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'new row for relation "plans" violates check constraint' },
      });

      const result = await planRepository.update('gold', {
        name: '', // 空の名前（NOT NULL制約違反）
        description: 'Updated description',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('violates check constraint');
      }
    });
  });

  describe('delete', () => {
    it('should delete plan successfully', async () => {
      const mockEq = jest.fn(() => ({ error: null }));
      mockDelete.mockReturnValue({ eq: mockEq });

      const result = await planRepository.delete('gold');

      expect(result.success).toBe(true);
    });

    it('should return error when deletion fails', async () => {
      const mockEq = jest.fn(() => ({ error: { message: 'Plan not found' } }));
      mockDelete.mockReturnValue({ eq: mockEq });

      const result = await planRepository.delete('non-existent');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Plan not found');
      }
    });

    it('should return error when deletion fails due to foreign key constraint', async () => {
      const mockEq = jest.fn(() => ({ 
        error: { message: 'update or delete on table "plans" violates foreign key constraint' } 
      }));
      mockDelete.mockReturnValue({ eq: mockEq });

      const result = await planRepository.delete('free'); // ユーザーが使用中のプラン

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('foreign key constraint');
      }
    });
  });
});
