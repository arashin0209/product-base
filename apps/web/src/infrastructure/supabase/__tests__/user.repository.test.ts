import { UserRepository } from '../user.repository';
import { supabase } from '../supabase.client';
import { User } from '@/domain/user/user.entity';
import { NotFoundError } from '@/shared/errors';

// Supabaseクライアントをモック
const mockSingle = jest.fn();
const mockEq = jest.fn(() => ({ single: mockSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
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

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockSupabase: any;

  beforeEach(() => {
    userRepository = new UserRepository();
    mockSupabase = supabase as any;
    jest.clearAllMocks();
    mockSingle.mockClear();
    mockEq.mockClear();
    mockSelect.mockClear();
    mockInsert.mockClear();
    mockUpdate.mockClear();
    mockDelete.mockClear();
  });

  describe('findById', () => {
    it('should return a user when found', async () => {
      const mockUserData = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        plan_type: 'free',
        plan_status: 'active',
        stripe_customer_id: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockSingle.mockResolvedValue({
        data: mockUserData,
        error: null,
      });

      const result = await userRepository.findById('user-123');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeInstanceOf(User);
        expect(result.data.id).toBe('user-123');
        expect(result.data.email).toBe('test@example.com');
        expect(result.data.name).toBe('Test User');
      }
    });

    it('should return NotFoundError when user not found', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const result = await userRepository.findById('non-existent');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(NotFoundError);
        expect(result.error.message).toBe('User not found');
      }
    });

    it('should return error when database error occurs', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const result = await userRepository.findById('user-123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Database connection failed');
      }
    });
  });

  describe('findByEmail', () => {
    it('should return a user when found by email', async () => {
      const mockUserData = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        plan_type: 'gold',
        plan_status: 'active',
        stripe_customer_id: 'cus_123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockSingle.mockResolvedValue({
        data: mockUserData,
        error: null,
      });

      const result = await userRepository.findByEmail('test@example.com');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeInstanceOf(User);
        expect(result.data.email).toBe('test@example.com');
        expect(result.data.planType).toBe('gold');
      }
    });
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const mockUserData = {
        id: 'user-123',
        email: 'new@example.com',
        name: 'New User',
        plan_type: 'free',
        plan_status: 'active',
        stripe_customer_id: null,
        stripe_subscription_id: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockSingle.mockResolvedValue({
        data: mockUserData,
        error: null,
      });

      const result = await userRepository.create({
        email: 'new@example.com',
        name: 'New User',
        planType: 'free',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeInstanceOf(User);
        expect(result.data.email).toBe('new@example.com');
        expect(result.data.name).toBe('New User');
      }
    });

    it('should return error when creation fails due to duplicate email', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'duplicate key value violates unique constraint "users_email_unique"' },
      });

      const result = await userRepository.create({
        email: 'existing@example.com',
        name: 'Existing User',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('duplicate key');
      }
    });

    it('should return error when creation fails due to validation error', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'new row for relation "users" violates check constraint' },
      });

      const result = await userRepository.create({
        email: 'invalid-email', // 無効なメール形式
        name: 'Test User',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('violates check constraint');
      }
    });

    it('should create user with default values when optional fields are not provided', async () => {
      const mockUserData = {
        id: 'user-456',
        email: 'minimal@example.com',
        name: null,
        plan_type: 'free',
        plan_status: 'active',
        stripe_customer_id: null,
        stripe_subscription_id: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockSingle.mockResolvedValue({
        data: mockUserData,
        error: null,
      });

      const result = await userRepository.create({
        email: 'minimal@example.com',
        // name と planType を省略
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('minimal@example.com');
        expect(result.data.planType).toBe('free');
        expect(result.data.planStatus).toBe('active');
      }
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const mockUserData = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Updated User',
        plan_type: 'gold',
        plan_status: 'active',
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T12:00:00Z',
      };

      mockSingle.mockResolvedValue({
        data: mockUserData,
        error: null,
      });

      const result = await userRepository.update('user-123', {
        name: 'Updated User',
        planType: 'gold',
        stripeCustomerId: 'cus_123',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Updated User');
        expect(result.data.planType).toBe('gold');
        expect(result.data.stripeCustomerId).toBe('cus_123');
      }
    });

    it('should return error when updating non-existent user', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const result = await userRepository.update('non-existent', {
        name: 'Updated User',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('No rows found');
      }
    });

    it('should return error when update fails due to validation error', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'new row for relation "users" violates check constraint' },
      });

      const result = await userRepository.update('user-123', {
        email: 'invalid-email', // 無効なメール形式
        name: 'Updated User',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('violates check constraint');
      }
    });

    it('should update user with partial data', async () => {
      const mockUserData = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Partially Updated User',
        plan_type: 'free',
        plan_status: 'active',
        stripe_customer_id: null,
        stripe_subscription_id: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T12:00:00Z',
      };

      mockSingle.mockResolvedValue({
        data: mockUserData,
        error: null,
      });

      const result = await userRepository.update('user-123', {
        name: 'Partially Updated User',
        // 他のフィールドは更新しない
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Partially Updated User');
        expect(result.data.planType).toBe('free'); // 元の値が保持される
      }
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      mockDelete.mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      const result = await userRepository.delete('user-123');

      expect(result.success).toBe(true);
    });

    it('should return error when deletion fails', async () => {
      mockDelete.mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: { message: 'User not found' },
        }),
      });

      const result = await userRepository.delete('non-existent');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('User not found');
      }
    });
  });
});
