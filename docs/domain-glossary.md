# Product Base - ドメイン用語集

## 1. 認証ドメイン (Authentication Domain)

| 日本語 | 英語 | 説明 |
|--------|------|------|
| 認証 | Authentication | ユーザーの身元確認プロセス |
| ユーザー | User | システム利用者 |
| ログイン | Sign In / Login | システムへの認証済みアクセス |
| ログアウト | Sign Out / Logout | システムからの認証解除 |
| 新規登録 | Sign Up / Registration | 新しいユーザーアカウントの作成 |
| パスワード | Password | 認証用の秘密情報 |
| メールアドレス | Email Address | ユーザー識別子兼連絡先 |
| セッション | Session | 認証状態の維持期間 |
| OAuth認証 | OAuth Authentication | 第三者認証プロバイダーによる認証 |
| Google認証 | Google Authentication | Google OAuth を使用した認証 |
| 認証トークン | Authentication Token | 認証状態を示すトークン |
| 認証エラー | Authentication Error | 認証処理の失敗 |

## 2. ユーザー管理ドメイン (User Management Domain)

| 日本語 | 英語 | 説明 |
|--------|------|------|
| ユーザー情報 | User Information | ユーザーの基本データ |
| プロフィール | Profile | ユーザーの詳細情報 |
| ユーザー名 | User Name | 表示用のユーザー識別名 |
| アカウント | Account | ユーザーのシステム利用権限 |
| アカウント削除 | Account Deletion | ユーザーアカウントの永久削除 |
| 退会 | Withdrawal | サービスからの離脱 |
| ユーザーID | User ID | システム内部でのユーザー識別子 |

## 3. プラン管理ドメイン (Plan Management Domain)

| 日本語 | 英語 | 説明 |
|--------|------|------|
| プラン | Plan | 利用可能な機能とその制限を定義したパッケージ |
| 無料プラン | Free Plan | 基本機能のみ利用可能なプラン |
| ゴールドプラン | Gold Plan | 拡張機能付きの有料プラン |
| プラチナプラン | Platinum Plan | 全機能利用可能な最上位プラン |
| プラン変更 | Plan Change | 利用プランの切り替え |
| アップグレード | Upgrade | より上位プランへの変更 |
| ダウングレード | Downgrade | より下位プランへの変更 |
| プラン機能 | Plan Feature | プランに含まれる利用可能機能 |
| 機能制限 | Feature Limitation | プランによる機能利用制約 |
| 使用量制限 | Usage Limitation | プランによる利用回数制約 |

## 4. サブスクリプション管理ドメイン (Subscription Management Domain)

| 日本語 | 英語 | 説明 |
|--------|------|------|
| サブスクリプション | Subscription | 継続課金による定期購読 |
| 契約 | Contract | ユーザーとサービス間の利用合意 |
| 契約状態 | Contract Status | サブスクリプションの現在状況 |
| アクティブ | Active | 正常に利用可能な状態 |
| トライアル | Trial / Trialing | 無料お試し期間中 |
| キャンセル | Canceled | 契約終了済み |
| 支払い失敗 | Past Due | 決済処理の失敗状態 |
| 未払い | Unpaid | 継続的な支払い失敗状態 |
| 不完全 | Incomplete | 初回支払いが未完了 |
| 期限切れ | Incomplete Expired | 支払い期限超過による終了 |
| 期間終了時キャンセル | Cancel at Period End | 現在期間終了後のキャンセル予約 |
| 契約期間 | Subscription Period | 課金サイクルの期間 |
| 更新日 | Renewal Date | 次回課金予定日 |
| キャンセル予定日 | Cancellation Date | キャンセル実行予定日 |

### Stripeサブスクリプション複合ステータス対応表

| Stripe Status | cancel_at_period_end | 日本語表示 | システム内での扱い | 説明 |
|---------------|---------------------|------------|-------------------|------|
| `incomplete` | - | 支払い確認中 | 機能制限 | 初回決済処理中・未完了 |
| `incomplete_expired` | - | 支払い期限切れ | プラン変更不可 | 決済期限超過で契約終了 |
| `trialing` | false | 無料トライアル中 | 全機能利用可 | トライアル期間中の有効状態 |
| `trialing` | true | トライアル中（解約予約） | 全機能利用可・更新停止 | トライアル終了後に解約 |
| `active` | false | 利用中 | 全機能利用可 | 正常な契約・決済済み状態 |
| `active` | true | 利用中（解約予約） | 全機能利用可・更新停止 | 期間終了時に解約予定 |
| `past_due` | - | 支払い遅延 | 機能制限警告 | 決済失敗・再試行期間中 |
| `canceled` | - | 解約済み | 基本機能のみ | 契約終了・即時機能停止 |
| `unpaid` | - | 未払い停止 | 機能停止 | 継続的決済失敗・機能停止 |

**実装での使用例:**
```typescript
// 複合ステータス判定での日本語表示
const getStatusDisplay = (subscription: {
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: string;
}): string => {
  const { status, cancel_at_period_end } = subscription;
  
  if (status === 'active' && cancel_at_period_end) {
    return `利用中（${formatDate(subscription.current_period_end)}に解約予定）`;
  }
  if (status === 'trialing' && cancel_at_period_end) {
    return 'トライアル中（解約予約）';
  }
  
  const statusMap = {
    'incomplete': '支払い確認中',
    'trialing': '無料トライアル中', 
    'active': '利用中',
    'canceled': '解約済み'
  };
  return statusMap[status] || status;
};

// 機能制限判定
const canAccessPaidFeatures = (subscription: any): boolean => {
  return ['active', 'trialing'].includes(subscription.status);
  // cancel_at_period_end=trueでも期間中は機能利用可能
};
```

## 5. 決済管理ドメイン (Payment Management Domain)

| 日本語 | 英語 | 説明 |
|--------|------|------|
| 決済 | Payment | 金銭の支払い処理 |
| 課金 | Billing | 定期的な料金請求 |
| 請求書 | Invoice | 支払い要求書 |
| 領収書 | Receipt | 支払い完了証明書 |
| 支払い方法 | Payment Method | 決済手段（カード、口座等） |
| クレジットカード | Credit Card | 決済用カード |
| Stripe顧客 | Stripe Customer | Stripeシステム内の顧客情報 |
| チェックアウト | Checkout | 決済画面・決済処理 |
| 請求ポータル | Billing Portal | 請求情報管理画面 |
| Webhook | Webhook | 外部システムからのイベント通知 |
| 月額料金 | Monthly Fee | 月次の定期料金 |
| 年額料金 | Annual Fee | 年次の定期料金 |

## 6. AI機能ドメイン (AI Feature Domain)

| 日本語 | 英語 | 説明 |
|--------|------|------|
| AI機能 | AI Feature | 人工知能を活用した機能 |
| AIチャット | AI Chat | AI との対話機能 |
| OpenAI | OpenAI | AIサービスプロバイダー |
| GPT | GPT (Generative Pre-trained Transformer) | OpenAIの言語モデル |
| プロンプト | Prompt | AIへの入力テキスト |
| レスポンス | Response | AIからの応答テキスト |
| チャット履歴 | Chat History | 過去の会話記録 |
| トークン | Token | AI処理の計算単位 |
| 使用量 | Usage | AI機能の利用回数・量 |
| 使用量ログ | Usage Log | AI機能利用の記録 |
| API呼び出し | API Call | 外部AIサービスへのリクエスト |
| レート制限 | Rate Limiting | API利用回数の制限 |

## 7. システム共通ドメイン (Common System Domain)

| 日本語 | 英語 | 説明 |
|--------|------|------|
| 機能 | Feature | システムの個別機能 |
| 有効 | Active / Enabled | 機能が利用可能な状態 |
| 無効 | Inactive / Disabled | 機能が利用不可能な状態 |
| 設定 | Settings / Configuration | システムやユーザーの設定項目 |
| ダッシュボード | Dashboard | 主要情報を集約した画面 |
| エラー | Error | システムの異常状態や処理失敗 |
| ローディング | Loading | 処理実行中の待機状態 |
| 通知 | Notification | ユーザーへのお知らせ |
| アクセス権 | Access Permission | 機能利用の許可状態 |
| 制限 | Limitation / Restriction | 利用制約 |
| ログ | Log | システムの動作記録 |

## 8. データベースドメイン (Database Domain)

| 日本語 | 英語 | 説明 |
|--------|------|------|
| テーブル | Table | データベースの表構造 |
| レコード | Record | テーブル内の1行のデータ |
| フィールド | Field / Column | テーブルの列項目 |
| 主キー | Primary Key | レコード識別用の一意キー |
| 外部キー | Foreign Key | 他テーブルとの関連キー |
| インデックス | Index | 検索高速化のための索引 |
| 制約 | Constraint | データ整合性を保つ規則 |
| マイグレーション | Migration | データベース構造の変更適用 |
| トランザクション | Transaction | 複数処理の原子的実行単位 |
| 作成日時 | Created At | レコード作成タイムスタンプ |
| 更新日時 | Updated At | レコード更新タイムスタンプ |

## 9. UI/UXドメイン (User Interface Domain)

| 日本語 | 英語 | 説明 |
|--------|------|------|
| 画面 | Screen / Page | ユーザーインターフェース画面 |
| ボタン | Button | クリック可能な操作要素 |
| フォーム | Form | 入力項目のグループ |
| 入力フィールド | Input Field | テキスト等の入力エリア |
| ドロップダウン | Dropdown | 選択肢を表示するメニュー |
| モーダル | Modal | 重要な操作用の上層ウィンドウ |
| ナビゲーション | Navigation | 画面間移動のメニュー |
| ハンバーガーメニュー | Hamburger Menu | 折りたたみ式メニュー |
| レスポンシブ | Responsive | 画面サイズ対応のデザイン |
| ダークモード | Dark Mode | 暗色テーマのUI表示 |

## 10. セキュリティドメイン (Security Domain)

| 日本語 | 英語 | 説明 |
|--------|------|------|
| 暗号化 | Encryption | データの秘匿化処理 |
| 認可 | Authorization | アクセス権限の確認 |
| アクセス制御 | Access Control | 機能利用権限の管理 |
| 行レベルセキュリティ | Row Level Security (RLS) | データベースの行単位アクセス制御 |
| CSRF対策 | CSRF Protection | クロスサイトリクエストフォージェリ対策 |
| XSS対策 | XSS Protection | クロスサイトスクリプティング対策 |
| 環境変数 | Environment Variables | 設定情報の安全な管理方法 |
| 秘密情報 | Secret Information | APIキーやパスワード等の機密データ |

## 用語使用ガイドライン

### 1. 一貫性の原則
- 同じ概念には必ず同じ用語を使用する
- 日本語・英語の対応関係を保つ
- ドメイン横断的な用語は重複を避ける

### 2. 実装時の注意
- データベーステーブル名・カラム名は英語を使用
- ユーザー向け表示は日本語を使用
- API仕様書・技術ドキュメントは英語を使用

### 3. 新規用語の追加ルール
- 既存用語との重複チェック
- 適切なドメインへの分類
- 日英対応の明確化