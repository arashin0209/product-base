# Product Base - テスト設計書

## 1. テスト戦略

### 1.1 基本方針
- **テスト駆動開発（TDD）**: 重要な機能は先にテストを作成
- **層別テスト**: DDD層（domain/application/infrastructure）に対応したテスト戦略
- **品質担保**: MVP機能は100%テストカバレッジを目標
- **自動化**: CI/CDでの自動テスト実行
- **モノレポ対応**: 共通パッケージとアプリ固有の適切なテスト分離

### 1.2 テストピラミッド構成
```
       /\
      /  \
     /E2E \     <- 少数の重要フロー
    /______\
   /        \
  /Integration\ <- API・DB連携テスト
 /____________\
/              \
/  Unit Tests   \ <- 多数のロジックテスト
/________________\
```

### 1.3 モノレポでのテスト構成
```
/tests/
├── unit/              # 単体テスト
│   ├── domain/        # ドメイン層テスト
│   ├── application/   # アプリケーション層テスト
│   └── components/    # コンポーネントテスト
├── integration/       # 統合テスト  
│   ├── api/          # APIエンドポイントテスト
│   └── db/           # データベーステスト
└── e2e/              # E2Eテスト
    └── web/          # フロントエンド統合テスト
```

## 2. 単体テスト（Unit Tests）

### 2.1 ドメイン層テスト

#### User Entity テスト
```typescript
// /tests/unit/domain/user.entity.test.ts
import { User } from '@/src/domain/user/user.entity';

describe('User Entity', () => {
  describe('constructor', () => {
    it('正常なユーザーデータで作成できる', () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'テストユーザー',
        planId: 'free'
      };
      
      const user = new User(userData);
      
      expect(user.id).toBe(userData.id);
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.planId).toBe(userData.planId);
    });

    it('無効なメールアドレスでエラーになる', () => {
      const userData = {
        id: 'user-123',
        email: 'invalid-email',
        name: 'テストユーザー',
        planId: 'free'
      };

      expect(() => new User(userData)).toThrow('無効なメールアドレスです');
    });
  });

  describe('updateName', () => {
    it('名前を更新できる', () => {
      const user = createTestUser();
      const newName = '更新後の名前';
      
      user.updateName(newName);
      
      expect(user.name).toBe(newName);
    });

    it('空の名前でエラーになる', () => {
      const user = createTestUser();
      
      expect(() => user.updateName('')).toThrow('名前は必須です');
    });
  });
});
```

#### Plan Entity テスト
```typescript
// /tests/unit/domain/plan.entity.test.ts
import { Plan } from '@/src/domain/plan/plan.entity';

describe('Plan Entity', () => {
  describe('canUse', () => {
    it('有効な機能でtrueを返す', () => {
      const features = { ai_requests: true, export_csv: false };
      const plan = new Plan('gold', features);
      
      expect(plan.canUse('ai_requests')).toBe(true);
      expect(plan.canUse('export_csv')).toBe(false);
    });

    it('存在しない機能でfalseを返す', () => {
      const plan = new Plan('free', {});
      
      expect(plan.canUse('non_existent_feature')).toBe(false);
    });
  });

  describe('getLimit', () => {
    it('制限値を正しく返す', () => {
      const features = { 
        ai_requests: { enabled: true, limit: 1000 },
        export_csv: { enabled: true, limit: null }
      };
      const plan = new Plan('gold', features);
      
      expect(plan.getLimit('ai_requests')).toBe(1000);
      expect(plan.getLimit('export_csv')).toBe(null); // 無制限
    });
  });
});
```

### 2.2 アプリケーション層テスト

#### UserService テスト
```typescript
// /tests/unit/application/user.service.test.ts
import { UserService } from '@/src/application/user/user.service';
import { MockUserRepository } from '@/tests/mocks/user.repository.mock';

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: MockUserRepository;

  beforeEach(() => {
    mockUserRepository = new MockUserRepository();
    userService = new UserService(mockUserRepository);
  });

  describe('createUser', () => {
    it('新規ユーザーを作成できる', async () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'テストユーザー',
        planId: 'free'
      };

      const result = await userService.createUser(userData);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe(userData.id);
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining(userData)
      );
    });

    it('重複メールアドレスでエラーになる', async () => {
      const userData = {
        id: 'user-123',
        email: 'existing@example.com',
        name: 'テストユーザー',
        planId: 'free'
      };

      mockUserRepository.findByEmail.mockResolvedValue(createTestUser());

      await expect(userService.createUser(userData))
        .rejects.toThrow('このメールアドレスは既に使用されています');
    });
  });

  describe('updateUser', () => {
    it('ユーザー情報を更新できる', async () => {
      const existingUser = createTestUser();
      const updateData = { name: '更新後の名前' };

      mockUserRepository.findById.mockResolvedValue(existingUser);

      const result = await userService.updateUser(existingUser.id, updateData);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe(updateData.name);
    });
  });
});
```

#### PlanService テスト
```typescript
// /tests/unit/application/plan.service.test.ts
import { PlanService } from '@/src/application/plan/plan.service';

describe('PlanService', () => {
  let planService: PlanService;
  let mockPlanRepository: MockPlanRepository;

  beforeEach(() => {
    mockPlanRepository = new MockPlanRepository();
    planService = new PlanService(mockPlanRepository);
  });

  describe('getUserPlan', () => {
    it('ユーザーのプラン情報を取得できる', async () => {
      const userId = 'user-123';
      const mockPlanFeatures = {
        ai_requests: { enabled: true, limit: 1000 },
        export_csv: { enabled: false, limit: 0 }
      };

      mockPlanRepository.getUserPlanFeatures.mockResolvedValue({
        planId: 'gold',
        features: mockPlanFeatures
      });

      const result = await planService.getUserPlan(userId);

      expect(result.name).toBe('gold');
      expect(result.canUse('ai_requests')).toBe(true);
      expect(result.canUse('export_csv')).toBe(false);
    });
  });

  describe('checkFeatureAccess', () => {
    it('機能利用権限をチェックできる', async () => {
      const userId = 'user-123';
      const featureId = 'ai_requests';

      mockPlanRepository.getUserPlanFeatures.mockResolvedValue({
        planId: 'gold',
        features: { ai_requests: { enabled: true, limit: 1000 } }
      });

      const hasAccess = await planService.checkFeatureAccess(userId, featureId);

      expect(hasAccess).toBe(true);
    });
  });
});
```

### 2.3 コンポーネントテスト

#### Button コンポーネントテスト
```typescript
// /tests/unit/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/packages/ui/button/Button';

describe('Button Component', () => {
  it('デフォルトプロパティで正しくレンダリングされる', () => {
    render(<Button>クリック</Button>);
    
    const button = screen.getByRole('button', { name: 'クリック' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary');
  });

  it('loading状態で無効化される', () => {
    render(<Button loading>読み込み中</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('クリックイベントが発火される', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>クリック</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disabled状態でクリックイベントが発火されない', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick} disabled>無効ボタン</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });
});
```

#### LoginForm コンポーネントテスト
```typescript
// /tests/unit/components/auth/LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/apps/web/app/components/auth/LoginForm';

describe('LoginForm Component', () => {
  it('フォームが正しくレンダリングされる', () => {
    render(<LoginForm onSubmit={jest.fn()} />);
    
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
  });

  it('有効な入力でsubmitが呼ばれる', async () => {
    const handleSubmit = jest.fn();
    render(<LoginForm onSubmit={handleSubmit} />);
    
    const emailInput = screen.getByLabelText('メールアドレス');
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });
    
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'password123');
    fireEvent.click(submitButton);
    
    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
  });

  it('空のフィールドでsubmitボタンが無効', () => {
    render(<LoginForm onSubmit={jest.fn()} />);
    
    const submitButton = screen.getByRole('button', { name: 'ログイン' });
    expect(submitButton).toBeDisabled();
  });

  it('エラーメッセージが表示される', () => {
    const error = 'ログインに失敗しました';
    render(<LoginForm onSubmit={jest.fn()} error={error} />);
    
    expect(screen.getByText(error)).toBeInTheDocument();
  });
});
```

## 3. 統合テスト（Integration Tests）

### 3.1 API統合テスト

#### 認証API テスト
```typescript
// /tests/integration/api/auth.test.ts
import { POST } from '@/apps/web/app/api/auth/login/route';
import { testDb, createTestUser } from '@/tests/helpers/db';

describe('/api/auth/login', () => {
  beforeEach(async () => {
    await testDb.reset();
  });

  it('正常なログインが成功する', async () => {
    // テストユーザー作成
    const testUser = await createTestUser({
      email: 'test@example.com',
      password: 'password123'
    });

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.user.email).toBe('test@example.com');
    expect(data.data.session.access_token).toBeDefined();
  });

  it('無効な認証情報でエラーになる', async () => {
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrong-password'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });
});
```

#### サブスクリプションAPI テスト
```typescript
// /tests/integration/api/subscription.test.ts
import { GET } from '@/apps/web/app/api/subscription/status/route';

describe('/api/subscription/status', () => {
  it('認証済みユーザーのサブスクリプション状態を取得', async () => {
    const testUser = await createTestUser({ planId: 'gold' });
    const authToken = await getAuthToken(testUser);

    const request = new Request('http://localhost/api/subscription/status', {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.plan_id).toBe('gold');
    expect(data.data.features).toBeDefined();
  });

  it('認証なしで401エラー', async () => {
    const request = new Request('http://localhost/api/subscription/status', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });
});
```

#### AI API テスト
```typescript
// /tests/integration/api/ai.test.ts
import { POST } from '@/apps/web/app/api/ai/openai/route';

describe('/api/ai/openai', () => {
  it('Goldプランユーザーがリクエスト成功', async () => {
    const testUser = await createTestUser({ planId: 'gold' });
    const authToken = await getAuthToken(testUser);

    const request = new Request('http://localhost/api/ai/openai', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Hello, AI!'
      })
    });

    // OpenAI APIをモック
    mockOpenAI.mockResolvedValue({
      message: 'Hello! How can I help you?',
      tokens_used: 15,
      cost: 0.0001
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.message).toBeDefined();
  });

  it('無料プランユーザーがプラン制限エラー', async () => {
    const testUser = await createTestUser({ planId: 'free' });
    const authToken = await getAuthToken(testUser);

    const request = new Request('http://localhost/api/ai/openai', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Hello, AI!'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error.code).toBe('PLAN_RESTRICTION');
  });
});
```

### 3.2 データベース統合テスト

```typescript
// /tests/integration/db/user.repository.test.ts
import { UserRepository } from '@/src/infrastructure/supabase/user.repository';
import { testDb } from '@/tests/helpers/db';

describe('UserRepository', () => {
  let userRepository: UserRepository;

  beforeEach(async () => {
    await testDb.reset();
    userRepository = new UserRepository();
  });

  describe('save', () => {
    it('新規ユーザーを保存できる', async () => {
      const user = createTestUser();
      
      const savedUser = await userRepository.save(user);
      
      expect(savedUser.id).toBe(user.id);
      expect(savedUser.email).toBe(user.email);
      
      // DBに実際に保存されているか確認
      const found = await userRepository.findById(user.id);
      expect(found).toBeDefined();
    });
  });

  describe('findByEmail', () => {
    it('メールアドレスでユーザーを検索できる', async () => {
      const user = await createAndSaveTestUser();
      
      const found = await userRepository.findByEmail(user.email);
      
      expect(found?.id).toBe(user.id);
    });

    it('存在しないメールアドレスでnullを返す', async () => {
      const found = await userRepository.findByEmail('nonexistent@example.com');
      
      expect(found).toBeNull();
    });
  });
});
```

## 4. E2Eテスト（End-to-End Tests）

### 4.1 Playwright設定

```typescript
// /tests/e2e/playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './web',
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit', 
      use: { ...devices['Desktop Safari'] }
    }
  ]
});
```

### 4.2 認証フローE2Eテスト

```typescript
// /tests/e2e/web/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('認証フロー', () => {
  test('メール・パスワードでログイン', async ({ page }) => {
    // ログインページにアクセス
    await page.goto('/login');
    
    // フォーム入力
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    
    // ログインボタンクリック
    await page.click('[data-testid="login-button"]');
    
    // ダッシュボードにリダイレクトされることを確認
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('ダッシュボード');
  });

  test('Googleログインボタンが表示される', async ({ page }) => {
    await page.goto('/login');
    
    const googleButton = page.locator('[data-testid="google-login-button"]');
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toContainText('Googleでサインイン');
  });

  test('ログイン失敗時にエラーメッセージ表示', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'wrong-password');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="error-message"]'))
      .toContainText('ログインに失敗しました');
  });
});
```

### 4.3 サブスクリプションフローE2Eテスト

```typescript
// /tests/e2e/web/subscription.spec.ts
test.describe('サブスクリプション管理', () => {
  test.beforeEach(async ({ page }) => {
    // テストユーザーでログイン
    await loginAsTestUser(page, { planId: 'free' });
  });

  test('プラン選択画面からCheckout', async ({ page }) => {
    await page.goto('/plans');
    
    // Goldプランを選択
    const goldPlanCard = page.locator('[data-testid="plan-card-gold"]');
    await expect(goldPlanCard).toBeVisible();
    
    await goldPlanCard.locator('[data-testid="select-plan-button"]').click();
    
    // Stripe Checkoutページにリダイレクト（URLの確認のみ）
    await expect(page).toHaveURL(/checkout\.stripe\.com/);
  });

  test('無料プランユーザーのAI機能制限', async ({ page }) => {
    await page.goto('/ai-chat');
    
    // AI機能が制限されていることを確認
    const restrictionMessage = page.locator('[data-testid="plan-restriction-message"]');
    await expect(restrictionMessage).toBeVisible();
    await expect(restrictionMessage).toContainText('この機能はGoldプラン以上で利用できます');
    
    // アップグレードボタンの確認
    const upgradeButton = page.locator('[data-testid="upgrade-button"]');
    await expect(upgradeButton).toBeVisible();
  });
});

test.describe('有料プランユーザー', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, { planId: 'gold' });
  });

  test('AI機能が利用可能', async ({ page }) => {
    await page.goto('/ai-chat');
    
    // チャット入力フィールドが利用可能
    const chatInput = page.locator('[data-testid="chat-input"]');
    await expect(chatInput).toBeEnabled();
    
    // メッセージ送信テスト
    await chatInput.fill('Hello, AI!');
    await page.click('[data-testid="send-button"]');
    
    // レスポンス待機（モック）
    await expect(page.locator('[data-testid="ai-response"]').first())
      .toBeVisible({ timeout: 10000 });
  });
});
```

### 4.4 レスポンシブテスト

```typescript
// /tests/e2e/web/responsive.spec.ts
test.describe('レスポンシブデザイン', () => {
  test('モバイルでハンバーガーメニュー', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAsTestUser(page);
    await page.goto('/dashboard');
    
    // ハンバーガーメニューボタンが表示される
    const hamburgerButton = page.locator('[data-testid="hamburger-menu"]');
    await expect(hamburgerButton).toBeVisible();
    
    // メニューを開く
    await hamburgerButton.click();
    const sidebarMenu = page.locator('[data-testid="sidebar-menu"]');
    await expect(sidebarMenu).toBeVisible();
    
    // ナビゲーションリンクの確認
    await expect(sidebarMenu.locator('text=サブスクリプション')).toBeVisible();
    await expect(sidebarMenu.locator('text=AI チャット')).toBeVisible();
  });

  test('タブレット表示', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await loginAsTestUser(page);
    await page.goto('/plans');
    
    // プランカードがタブレット用レイアウトで表示される
    const planCards = page.locator('[data-testid="plan-card"]');
    await expect(planCards).toHaveCount(3);
    
    // カードが2列で表示されることを確認（CSSグリッド）
    const firstCard = planCards.first();
    const secondCard = planCards.nth(1);
    
    const firstCardBox = await firstCard.boundingBox();
    const secondCardBox = await secondCard.boundingBox();
    
    expect(firstCardBox?.y).toBe(secondCardBox?.y); // 同じ行
  });
});
```

## 5. テストデータとモック

### 5.1 テストデータファクトリー

```typescript
// /tests/helpers/factories.ts
export const createTestUser = (overrides: Partial<User> = {}): User => {
  return {
    id: `user-${Date.now()}`,
    email: `test-${Date.now()}@example.com`,
    name: 'テストユーザー',
    planId: 'free',
    stripeCustomerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
};

export const createTestSubscription = (overrides = {}) => {
  return {
    id: `sub-${Date.now()}`,
    userId: 'user-123',
    planId: 'gold',
    stripeSubscriptionId: `stripe-sub-${Date.now()}`,
    status: 'active',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    cancelAtPeriodEnd: false,
    ...overrides
  };
};

export const createTestPlan = (planId: string) => {
  const planConfigs = {
    free: { name: '無料プラン', features: {} },
    gold: { 
      name: 'Goldプラン', 
      features: { ai_requests: true, export_csv: false }
    },
    platinum: { 
      name: 'プラチナプラン', 
      features: { ai_requests: true, export_csv: true, custom_theme: true }
    }
  };
  
  return new Plan(planId, planConfigs[planId]?.features || {});
};
```

### 5.2 APIモック

```typescript
// /tests/mocks/api.mock.ts
export const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
};

export const mockStripe = {
  checkout: {
    sessions: {
      create: jest.fn()
    }
  },
  billingPortal: {
    sessions: {
      create: jest.fn()
    }
  }
};

export const mockSupabase = {
  auth: {
    getUser: jest.fn(),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn()
  }))
};
```

### 5.3 データベースヘルパー

```typescript
// /tests/helpers/db.ts
export const testDb = {
  async reset() {
    // テストデータベースをリセット
    await db.delete(aiUsageLogs);
    await db.delete(userSubscriptions);  
    await db.delete(users);
  },
  
  async seed() {
    // 基本テストデータを投入
    await db.insert(plans).values([
      { id: 'free', name: '無料プラン', displayName: '無料プラン' },
      { id: 'gold', name: 'Goldプラン', displayName: 'Goldプラン' },
      { id: 'platinum', name: 'プラチナプラン', displayName: 'プラチナプラン' }
    ]);
    
    await db.insert(features).values([
      { id: 'ai_requests', name: 'AI機能', displayName: 'AI機能' },
      { id: 'export_csv', name: 'CSVエクスポート', displayName: 'CSVエクスポート' }
    ]);
  }
};

export const createAndSaveTestUser = async (overrides = {}) => {
  const user = createTestUser(overrides);
  await db.insert(users).values(user);
  return user;
};
```

## 6. CI/CD統合

### 6.1 GitHub Actions設定

```yaml
# /.github/workflows/test.yml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm test:unit
      - run: pnpm test:coverage
      
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm build
      - run: pnpm test:e2e
```

### 6.2 package.jsonスクリプト

```json
{
  "scripts": {
    "test": "pnpm test:unit && pnpm test:integration",
    "test:unit": "jest --config jest.unit.config.js",
    "test:integration": "jest --config jest.integration.config.js",
    "test:e2e": "playwright test",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch"
  }
}
```

## 7. テスト品質管理

### 7.1 カバレッジ要件
- **Domain層**: 100%（重要なビジネスロジック）
- **Application層**: 90%以上
- **API層**: 80%以上
- **Components層**: 70%以上

### 7.2 品質ゲート
- すべてのテストが成功
- カバレッジ閾値を満たす
- E2Eテストで主要フローが動作
- セキュリティテスト（認証・認可）が成功

### 7.3 継続的改善
- テスト実行時間の最適化
- フレイキーテストの特定と修正
- テストメンテナンスの自動化
- 新機能のテスト追加忘れ防止

これで、モノレポ構成に完全対応し、DDD層別テスト戦略、プラン機能制限テスト、外部サービスモック対応まで網羅したテスト設計書が完成しました！