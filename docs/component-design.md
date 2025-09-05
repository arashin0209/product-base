# Product Base - コンポーネント設計書

## 1. 設計方針

### 1.1 基本原則
- **Design System**: shadcn/ui をベースとした統一デザイン
- **責務分離**: 共通UI（packages/ui）とアプリ固有UI（apps/web/components）の明確な分離
- **再利用性**: 複数アプリで活用できる汎用コンポーネント設計
- **型安全性**: TypeScript による厳密な型定義
- **アクセシビリティ**: WCAG 2.1 AA 準拠

### 1.2 モノレポ構成でのコンポーネント配置

#### 共通UIコンポーネント
```
/packages/ui/
├── button/           # 汎用ボタン
├── card/            # 汎用カード
├── form/            # フォーム関連
├── modal/           # モーダル・ダイアログ
├── navigation/      # ナビゲーション
├── layout/          # レイアウト関連
└── theme/           # テーマ・スタイリング
```

#### アプリ固有コンポーネント
```
/apps/web/app/components/
├── auth/            # 認証関連画面
├── dashboard/       # ダッシュボード固有
├── subscription/    # サブスク管理固有
├── billing/         # 決済関連
└── ai/              # AI機能関連
```

### 1.3 shadcn/ui 使用方針
- **Base Components**: shadcn/ui のコンポーネントを `/packages/ui` で拡張
- **Theme System**: Tailwind CSS + CSS Variables
- **Dark Mode**: システム対応 + ユーザー選択可能
- **Responsive**: モバイルファースト設計

## 2. 共通UIコンポーネント（/packages/ui）

### 2.1 基本コンポーネント

#### Button
```typescript
// /packages/ui/button/Button.tsx
interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'default',
  loading = false,
  disabled = false,
  children,
  onClick,
  ...props
}) => {
  return (
    <button
      className={cn(
        buttonVariants({ variant, size }),
        loading && 'cursor-not-allowed opacity-50'
      )}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
      {children}
    </button>
  );
};
```

#### Card
```typescript
// /packages/ui/card/Card.tsx
interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined';
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  ...props
}) => {
  return (
    <div
      className={cn(cardVariants({ variant }), className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col space-y-1.5 p-6">{children}</div>
);

export const CardTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-2xl font-semibold leading-none tracking-tight">{children}</h3>
);

export const CardContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-6 pt-0">{children}</div>
);
```

#### Modal
```typescript
// /packages/ui/modal/Modal.tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(modalSizes[size])}>
        {title && (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
};
```

### 2.2 フォームコンポーネント

#### Input
```typescript
// /packages/ui/form/Input.tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  required = false,
  className,
  ...props
}) => {
  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={props.id}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <input
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-500 focus-visible:ring-red-500",
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {helperText && !error && <p className="text-sm text-muted-foreground">{helperText}</p>}
    </div>
  );
};
```

#### Form
```typescript
// /packages/ui/form/Form.tsx
interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
}

export const Form: React.FC<FormProps> = ({ onSubmit, children, ...props }) => {
  return (
    <form onSubmit={onSubmit} {...props}>
      {children}
    </form>
  );
};

// FormField wrapper for consistent spacing
export const FormField: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="space-y-2 mb-4">{children}</div>
);
```

### 2.3 ナビゲーションコンポーネント

#### Header
```typescript
// /packages/ui/navigation/Header.tsx
interface HeaderProps {
  logo: React.ReactNode;
  navigation?: React.ReactNode;
  userMenu?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ logo, navigation, userMenu }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">{logo}</div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          {navigation}
          {userMenu}
        </div>
      </div>
    </header>
  );
};
```

#### Sidebar
```typescript
// /packages/ui/navigation/Sidebar.tsx
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, children }) => {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <nav className="flex flex-col space-y-4">
          {children}
        </nav>
      </SheetContent>
    </Sheet>
  );
};

interface SidebarItemProps {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ href, icon, children, active }) => {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
        active && "bg-accent text-accent-foreground"
      )}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
};
```

### 2.4 レイアウトコンポーネント

#### Container
```typescript
// /packages/ui/layout/Container.tsx
interface ContainerProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  size = 'lg',
  className,
}) => {
  return (
    <div className={cn(containerSizes[size], className)}>
      {children}
    </div>
  );
};
```

#### PageLayout
```typescript
// /packages/ui/layout/PageLayout.tsx
interface PageLayoutProps {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  header,
  sidebar,
  children,
  footer,
}) => {
  return (
    <div className="min-h-screen flex flex-col">
      {header}
      <div className="flex-1 flex">
        {sidebar}
        <main className="flex-1">{children}</main>
      </div>
      {footer}
    </div>
  );
};
```

### 2.5 テーマ・スタイリング

#### Theme Provider
```typescript
// /packages/ui/theme/ThemeProvider.tsx
interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: 'light' | 'dark' | 'system';
  storageKey?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'system',
  storageKey = 'ui-theme',
}) => {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem
      storageKey={storageKey}
    >
      {children}
    </NextThemesProvider>
  );
};
```

#### Theme Toggle
```typescript
// /packages/ui/theme/ThemeToggle.tsx
export const ThemeToggle = () => {
  const { setTheme, theme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

## 3. アプリ固有コンポーネント（/apps/web/app/components）

### 3.1 認証関連コンポーネント

#### LoginForm
```typescript
// /apps/web/app/components/auth/LoginForm.tsx
interface LoginFormProps {
  onSubmit: (data: { email: string; password: string }) => void;
  loading?: boolean;
  error?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, loading, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ email, password });
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>ログイン</CardTitle>
      </CardHeader>
      <CardContent>
        <Form onSubmit={handleSubmit}>
          <FormField>
            <Input
              label="メールアドレス"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              error={error}
            />
          </FormField>
          <FormField>
            <Input
              label="パスワード"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </FormField>
          <Button
            type="submit"
            className="w-full"
            loading={loading}
            disabled={!email || !password}
          >
            ログイン
          </Button>
        </Form>
        <div className="mt-4">
          <GoogleLoginButton />
        </div>
      </CardContent>
    </Card>
  );
};
```

#### GoogleLoginButton
```typescript
// /apps/web/app/components/auth/GoogleLoginButton.tsx
export const GoogleLoginButton: React.FC = () => {
  const handleGoogleLogin = async () => {
    // Google OAuth 処理
  };

  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={handleGoogleLogin}
    >
      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
        {/* Google icon */}
      </svg>
      Googleでサインイン
    </Button>
  );
};
```

### 3.2 ダッシュボード関連コンポーネント

#### DashboardLayout
```typescript
// /apps/web/app/components/dashboard/DashboardLayout.tsx
interface DashboardLayoutProps {
  children: React.ReactNode;
  user: User;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, user }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <PageLayout
      header={
        <Header
          logo={<Logo />}
          userMenu={<UserMenu user={user} />}
          navigation={
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          }
        />
      }
      sidebar={
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}>
          <DashboardNavigation />
        </Sidebar>
      }
    >
      <Container>{children}</Container>
    </PageLayout>
  );
};
```

#### UserMenu
```typescript
// /apps/web/app/components/dashboard/UserMenu.tsx
interface UserMenuProps {
  user: User;
}

export const UserMenu: React.FC<UserMenuProps> = ({ user }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          <span>プロフィール</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <CreditCard className="mr-2 h-4 w-4" />
          <span>サブスクリプション</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOut className="mr-2 h-4 w-4" />
          <span>ログアウト</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

### 3.3 サブスクリプション関連コンポーネント

#### PlanCard
```typescript
// /apps/web/app/components/subscription/PlanCard.tsx
interface PlanCardProps {
  plan: {
    id: string;
    name: string;
    displayName: string;
    price: number;
    features: string[];
  };
  currentPlan?: string;
  onSelect: (planId: string) => void;
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan, currentPlan, onSelect }) => {
  const isCurrent = currentPlan === plan.id;

  return (
    <Card className={cn("relative", isCurrent && "border-primary")}>
      {isCurrent && (
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
            現在のプラン
          </span>
        </div>
      )}
      <CardHeader>
        <CardTitle>{plan.displayName}</CardTitle>
        <div className="text-3xl font-bold">
          ¥{plan.price.toLocaleString()}
          <span className="text-sm font-normal text-muted-foreground">/月</span>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 mb-6">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-primary" />
              {feature}
            </li>
          ))}
        </ul>
        <Button
          className="w-full"
          onClick={() => onSelect(plan.id)}
          disabled={isCurrent}
        >
          {isCurrent ? '選択中' : '選択する'}
        </Button>
      </CardContent>
    </Card>
  );
};
```

#### SubscriptionStatus
```typescript
// /apps/web/app/components/subscription/SubscriptionStatus.tsx
interface SubscriptionStatusProps {
  subscription: {
    planName: string;
    status: string;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd: boolean;
  };
}

export const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({ subscription }) => {
  const getStatusBadge = () => {
    switch (subscription.status) {
      case 'active':
        return <Badge variant="success">有効</Badge>;
      case 'trialing':
        return <Badge variant="info">トライアル中</Badge>;
      case 'past_due':
        return <Badge variant="warning">支払い失敗</Badge>;
      case 'canceled':
        return <Badge variant="secondary">キャンセル済み</Badge>;
      default:
        return <Badge>{subscription.status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>サブスクリプション状態</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>プラン:</span>
            <span className="font-medium">{subscription.planName}</span>
          </div>
          <div className="flex justify-between">
            <span>状態:</span>
            {getStatusBadge()}
          </div>
          {subscription.currentPeriodEnd && (
            <div className="flex justify-between">
              <span>次回更新日:</span>
              <span>{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
```

### 3.4 AI機能関連コンポーネント

#### AIChat
```typescript
// /apps/web/app/components/ai/AIChat.tsx
interface AIChatProps {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  onSendMessage: (message: string) => void;
  loading?: boolean;
}

export const AIChat: React.FC<AIChatProps> = ({ messages, onSendMessage, loading }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle>AI チャット</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
        </div>
        <Form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="メッセージを入力..."
            className="flex-1"
          />
          <Button type="submit" loading={loading} disabled={!input.trim()}>
            送信
          </Button>
        </Form>
      </CardContent>
    </Card>
  );
};
```

## 4. Hooks とカスタムフック

### 4.1 認証関連フック

#### 4.1.1 useAuth フックの実装

```typescript
// /apps/web/app/hooks/useAuth.ts
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (email: string, password: string) => {
    // ログイン処理
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      // 1. Supabase認証実行
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });
      
      if (error) throw error;
      
      // 2. 【重要】ユーザーレコード作成
      if (data.user) {
        const userResponse = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: data.user.id, // ← auth.users.idを使用（必須）
            email: data.user.email,
            name: name
          })
        });
        
        if (!userResponse.ok) {
          throw new Error('Failed to create user record');
        }
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const logout = async () => {
    // ログアウト処理
  };

  return {
    user,
    loading,
    login,
    signUp,
    logout,
  };
};
```

#### 4.1.2 型安全性の向上（推奨）
```typescript
import { z } from 'zod';

// Zodスキーマ例
const CreateUserSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  planType: z.enum(['free', 'gold', 'platinum']).optional()
});

type CreateUserData = z.infer<typeof CreateUserSchema>;

// バリデーション使用例
const validateUserData = (data: unknown): CreateUserData => {
  return CreateUserSchema.parse(data);
};
```

### 4.2 サブスクリプション関連フック

```typescript
// /apps/web/app/hooks/useSubscription.ts
export const useSubscription = () => {
  const [subscription, setSubscription] = useState(null);
  const [features, setFeatures] = useState({});

  const checkFeature = (featureId: string): boolean => {
    return features[featureId]?.enabled || false;
  };

  return {
    subscription,
    features,
    checkFeature,
  };
};
```

## 5. スタイリング規約

### 5.1 Tailwind CSS クラス使用規約

```typescript
// 推奨: 条件付きスタイルの統合
const buttonStyles = cn(
  "base-classes",
  variant === 'primary' && "primary-classes",
  size === 'large' && "large-classes",
  disabled && "disabled-classes"
);

// 非推奨: 複雑な条件分岐
const buttonStyles = `base-classes ${variant === 'primary' ? 'primary-classes' : ''} ...`;
```

### 5.2 カスタムCSS変数

```css
/* /packages/ui/theme/globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  /* ... その他の変数 */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... ダークテーマの変数 */
}
```

## 6. テストとStorybook

### 6.1 コンポーネントテスト例

```typescript
// /packages/ui/button/Button.test.tsx
describe('Button Component', () => {
  it('renders correctly with default props', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### 6.2 Storybook設定

```typescript
// /packages/ui/button/Button.stories.tsx
export default {
  title: 'UI/Button',
  component: Button,
} as Meta;

export const Default: Story = {
  args: {
    children: 'Button',
  },
};

export const Loading: Story = {
  args: {
    children: 'Loading Button',
    loading: true,
  },
};
```

## 7. 開発・運用ガイドライン

### 7.1 コンポーネント追加フロー

1. **共通性の判定**: 複数アプリで使用するか？
2. **配置決定**: `/packages/ui` または `/apps/web/components`
3. **型定義**: TypeScript インターフェース定義
4. **実装**: shadcn/ui ベースで実装
5. **テスト**: 単体テスト作成
6. **Storybook**: ドキュメント作成
7. **レビュー**: コードレビューと承認

### 7.2 命名規約

- **コンポーネント**: PascalCase (`Button`, `LoginForm`)
- **Props Interface**: `ComponentNameProps`
- **ファイル名**: PascalCase (`Button.tsx`)
- **ディレクトリ**: kebab-case (`auth/`, `subscription/`)

### 7.3 パフォーマンス考慮事項

- **Lazy Loading**: 大きなコンポーネントの遅延読み込み
- **Memoization**: React.memo の適切な使用
- **Bundle Size**: 必要最小限のインポート
- **Tree Shaking**: 未使用コードの除去