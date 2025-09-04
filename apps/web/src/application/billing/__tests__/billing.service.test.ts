import { BillingService } from '../billing.service';
import { StripeClient } from '@/infrastructure/stripe/stripe.client';
import { UserService } from '../../user/user.service';
import { User } from '@/domain/user/user.entity';
import { ExternalServiceError, NotFoundError } from '@/shared/errors';

// StripeClientをモック
jest.mock('@/infrastructure/stripe/stripe.client', () => ({
  StripeClient: jest.fn().mockImplementation(() => ({
    createCustomer: jest.fn(),
    createCheckoutSession: jest.fn(),
    createBillingPortalSession: jest.fn(),
  })),
}));

// UserServiceをモック
jest.mock('../../user/user.service', () => ({
  UserService: jest.fn().mockImplementation(() => ({
    getCurrentUser: jest.fn(),
    updateStripeCustomerId: jest.fn(),
    updateUserPlan: jest.fn(),
  })),
}));

describe('BillingService', () => {
  let billingService: BillingService;
  let mockStripeClient: jest.Mocked<StripeClient>;
  let mockUserService: jest.Mocked<UserService>;

  beforeEach(() => {
    mockStripeClient = {
      createCustomer: jest.fn(),
      createCheckoutSession: jest.fn(),
      createBillingPortalSession: jest.fn(),
    } as jest.Mocked<StripeClient>;
    
    mockUserService = {
      getCurrentUser: jest.fn(),
      updateStripeCustomerId: jest.fn(),
      updateUserPlan: jest.fn(),
    } as jest.Mocked<UserService>;
    
    billingService = new BillingService(mockStripeClient, mockUserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCheckoutSession', () => {
    const mockUser = new User(
      'user-123',
      'test@example.com',
      'Test User',
      'free',
      'active',
      undefined,
      new Date(),
      new Date()
    );

    it('should create checkout session successfully with existing customer', async () => {
      // ユーザーに既にStripe顧客IDがある場合
      const userWithStripeId = new User(
        'user-123',
        'test@example.com',
        'Test User',
        'free',
        'active',
        'cus_existing123',
        new Date(),
        new Date()
      );

      mockUserService.getCurrentUser.mockResolvedValue({
        success: true,
        data: userWithStripeId,
      });

      const mockSession = {
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/c/pay/cs_test123',
      };

      mockStripeClient.createCheckoutSession.mockResolvedValue(mockSession);

      const result = await billingService.createCheckoutSession(
        'user-123',
        'price_123',
        'https://success.com',
        'https://cancel.com'
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sessionId).toBe('cs_test123');
        expect(result.data.url).toBe('https://checkout.stripe.com/c/pay/cs_test123');
      }

      expect(mockUserService.getCurrentUser).toHaveBeenCalledWith('user-123');
      expect(mockStripeClient.createCheckoutSession).toHaveBeenCalledWith({
        customerId: 'cus_existing123',
        priceId: 'price_123',
        successUrl: 'https://success.com',
        cancelUrl: 'https://cancel.com',
        metadata: {
          userId: 'user-123',
        },
      });
    });

    it('should create checkout session successfully with new customer', async () => {
      mockUserService.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const mockCustomer = { id: 'cus_new123' };
      mockStripeClient.createCustomer.mockResolvedValue(mockCustomer);

      mockUserService.updateStripeCustomerId.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const mockSession = {
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/c/pay/cs_test123',
      };

      mockStripeClient.createCheckoutSession.mockResolvedValue(mockSession);

      const result = await billingService.createCheckoutSession(
        'user-123',
        'price_123',
        'https://success.com',
        'https://cancel.com'
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sessionId).toBe('cs_test123');
        expect(result.data.url).toBe('https://checkout.stripe.com/c/pay/cs_test123');
      }

      expect(mockStripeClient.createCustomer).toHaveBeenCalledWith(
        'test@example.com',
        'Test User'
      );
      expect(mockUserService.updateStripeCustomerId).toHaveBeenCalledWith(
        'user-123',
        'cus_new123'
      );
    });

    it('should return error when user not found', async () => {
      mockUserService.getCurrentUser.mockResolvedValue({
        success: false,
        error: new NotFoundError('User not found'),
      });

      const result = await billingService.createCheckoutSession(
        'user-123',
        'price_123',
        'https://success.com',
        'https://cancel.com'
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(NotFoundError);
      }

      expect(mockStripeClient.createCustomer).not.toHaveBeenCalled();
      expect(mockStripeClient.createCheckoutSession).not.toHaveBeenCalled();
    });

    it('should return error when Stripe customer creation fails', async () => {
      mockUserService.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      mockStripeClient.createCustomer.mockRejectedValue(new Error('Stripe API error'));

      const result = await billingService.createCheckoutSession(
        'user-123',
        'price_123',
        'https://success.com',
        'https://cancel.com'
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ExternalServiceError);
        expect(result.error.message).toContain('Failed to create checkout session');
      }
    });

    it('should return error when checkout session creation fails', async () => {
      mockUserService.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const mockCustomer = { id: 'cus_new123' };
      mockStripeClient.createCustomer.mockResolvedValue(mockCustomer);

      mockUserService.updateStripeCustomerId.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      mockStripeClient.createCheckoutSession.mockRejectedValue(new Error('Checkout session creation failed'));

      const result = await billingService.createCheckoutSession(
        'user-123',
        'price_123',
        'https://success.com',
        'https://cancel.com'
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ExternalServiceError);
        expect(result.error.message).toContain('Failed to create checkout session');
      }
    });
  });

  describe('createBillingPortalSession', () => {
    const mockUser = new User(
      'user-123',
      'test@example.com',
      'Test User',
      'gold',
      'active',
      'cus_existing123',
      new Date(),
      new Date()
    );

    it('should create billing portal session successfully', async () => {
      mockUserService.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const mockSession = {
        url: 'https://billing.stripe.com/session/portal_123',
      };

      mockStripeClient.createBillingPortalSession.mockResolvedValue(mockSession);

      const result = await billingService.createBillingPortalSession(
        'user-123',
        'https://return.com'
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.url).toBe('https://billing.stripe.com/session/portal_123');
      }

      expect(mockUserService.getCurrentUser).toHaveBeenCalledWith('user-123');
      expect(mockStripeClient.createBillingPortalSession).toHaveBeenCalledWith({
        customerId: 'cus_existing123',
        returnUrl: 'https://return.com',
      });
    });

    it('should return error when user not found', async () => {
      mockUserService.getCurrentUser.mockResolvedValue({
        success: false,
        error: new NotFoundError('User not found'),
      });

      const result = await billingService.createBillingPortalSession(
        'user-123',
        'https://return.com'
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(NotFoundError);
      }

      expect(mockStripeClient.createBillingPortalSession).not.toHaveBeenCalled();
    });

    it('should return error when user has no Stripe customer ID', async () => {
      const userWithoutStripeId = new User(
        'user-123',
        'test@example.com',
        'Test User',
        'free',
        'active',
        undefined, // No Stripe customer ID
        new Date(),
        new Date()
      );

      mockUserService.getCurrentUser.mockResolvedValue({
        success: true,
        data: userWithoutStripeId,
      });

      const result = await billingService.createBillingPortalSession(
        'user-123',
        'https://return.com'
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(NotFoundError);
        expect(result.error.message).toBe('No Stripe customer found');
      }

      expect(mockStripeClient.createBillingPortalSession).not.toHaveBeenCalled();
    });

    it('should return error when Stripe billing portal creation fails', async () => {
      mockUserService.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      mockStripeClient.createBillingPortalSession.mockRejectedValue(new Error('Billing portal creation failed'));

      const result = await billingService.createBillingPortalSession(
        'user-123',
        'https://return.com'
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ExternalServiceError);
        expect(result.error.message).toContain('Failed to create billing portal session');
      }
    });
  });

  describe('handleWebhook', () => {
    it('should handle successful webhook processing', async () => {
      const mockEvent = {
        id: 'evt_test123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test123',
            customer: 'cus_test123',
            metadata: {
              userId: 'user-123',
            },
          },
        },
      };

      const mockUser = new User(
        'user-123',
        'test@example.com',
        'Test User',
        'free',
        'active',
        'cus_test123',
        new Date(),
        new Date()
      );

      mockUserService.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      mockUserService.updateUserPlan.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const result = await billingService.handleWebhook(mockEvent);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.processed).toBe(true);
      }
    });

    it('should handle webhook with unknown event type', async () => {
      const mockEvent = {
        id: 'evt_test123',
        type: 'unknown.event.type',
        data: {
          object: {
            id: 'cs_test123',
          },
        },
      };

      const result = await billingService.handleWebhook(mockEvent);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.processed).toBe(false);
        expect(result.data.reason).toBe('Unhandled event type');
      }
    });

    it('should handle webhook processing error', async () => {
      const mockEvent = {
        id: 'evt_test123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test123',
            customer: 'cus_test123',
            metadata: {
              userId: 'user-123',
            },
          },
        },
      };

      mockUserService.getCurrentUser.mockRejectedValue(new Error('Database error'));

      const result = await billingService.handleWebhook(mockEvent);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ExternalServiceError);
        expect(result.error.message).toContain('Failed to process webhook');
      }
    });
  });
});
