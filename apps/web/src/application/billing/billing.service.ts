import { StripeClient } from '@/infrastructure/stripe/stripe.client';
import { UserService } from '../user/user.service';
import { Result, success, failure } from '@/shared/result';
import { NotFoundError, ExternalServiceError } from '@/shared/errors';

export class BillingService {
  constructor(
    private stripeClient: StripeClient,
    private userService: UserService
  ) {}

  async createCheckoutSession(
    userId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<Result<{ sessionId: string; url: string }, Error>> {
    try {
      // ユーザー情報を取得
      const userResult = await this.userService.getCurrentUser(userId);
      if (!userResult.success) {
        return failure(userResult.error);
      }

      const user = userResult.data;

      // Stripe顧客を作成または取得
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await this.stripeClient.createCustomer(user.email, user.name);
        customerId = customer.id;

        // ユーザーにStripe顧客IDを保存
        await this.userService.updateStripeCustomerId(userId, customerId);
      }

      // Checkoutセッションを作成
      const session = await this.stripeClient.createCheckoutSession({
        customerId,
        priceId,
        successUrl,
        cancelUrl,
        metadata: {
          userId,
        },
      });

      return success({
        sessionId: session.id,
        url: session.url!,
      });
    } catch (error) {
      return failure(new ExternalServiceError(
        `Failed to create checkout session: ${error}`,
        'stripe'
      ));
    }
  }

  async createBillingPortalSession(userId: string, returnUrl: string): Promise<Result<{ url: string }, Error>> {
    try {
      // ユーザー情報を取得
      const userResult = await this.userService.getCurrentUser(userId);
      if (!userResult.success) {
        return failure(userResult.error);
      }

      const user = userResult.data;

      if (!user.stripeCustomerId) {
        return failure(new NotFoundError('No billing information found'));
      }

      // Billing Portalセッションを作成
      const session = await this.stripeClient.createBillingPortalSession(
        user.stripeCustomerId,
        returnUrl
      );

      return success({
        url: session.url,
      });
    } catch (error) {
      return failure(new ExternalServiceError(
        `Failed to create billing portal session: ${error}`,
        'stripe'
      ));
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<Result<{ message: string }, Error>> {
    try {
      // Stripeでサブスクリプションをキャンセル
      const subscription = await this.stripeClient.cancelSubscription(subscriptionId);
      
      return success({
        message: 'Subscription cancelled successfully',
      });
    } catch (error) {
      return failure(new ExternalServiceError(
        `Failed to cancel subscription: ${error}`,
        'stripe'
      ));
    }
  }

  async handleWebhookEvent(event: any): Promise<Result<void, Error>> {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return success(undefined);
    } catch (error) {
      return failure(new Error(`Webhook handling failed: ${error}`));
    }
  }

  private async handleCheckoutCompleted(session: any): Promise<void> {
    const userId = session.metadata?.userId;
    if (!userId) return;

    // サブスクリプション情報を取得
    const subscription = await this.stripeClient.getSubscription(session.subscription);
    
    // ユーザーのプランを更新
    await this.userService.updateUserPlan(
      userId,
      'gold', // 実際のプランタイプを取得する必要があります
      subscription.status
    );
  }

  private async handleSubscriptionUpdated(subscription: any): Promise<void> {
    const userId = subscription.metadata?.userId;
    if (!userId) return;

    await this.userService.updateUserPlan(
      userId,
      'gold', // 実際のプランタイプを取得する必要があります
      subscription.status
    );
  }

  private async handleSubscriptionDeleted(subscription: any): Promise<void> {
    const userId = subscription.metadata?.userId;
    if (!userId) return;

    await this.userService.updateUserPlan(
      userId,
      'free',
      'canceled'
    );
  }
}
