# ベースイメージ
FROM node:18-alpine AS base

# 依存関係のインストール
FROM base AS deps
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/ui/package*.json ./packages/ui/
COPY packages/shared-utils/package*.json ./packages/shared-utils/

# 依存関係をインストール
RUN npm ci --only=production

# ビルドステージ
FROM base AS builder
WORKDIR /app

# 依存関係をコピー
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# アプリケーションをビルド
RUN npm run build

# 本番ステージ
FROM base AS runner
WORKDIR /app

# 本番用の依存関係のみをインストール
RUN npm ci --only=production && npm cache clean --force

# ビルドしたアプリケーションをコピー
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json

# 環境変数を設定
ENV NODE_ENV=production
ENV PORT=3000

# ポートを公開
EXPOSE 3000

# アプリケーションを起動
CMD ["npm", "run", "start", "--workspace=web"]
