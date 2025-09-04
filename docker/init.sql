-- データベース初期化スクリプト

-- プランテーブルの初期データを挿入
INSERT INTO plans (id, name, description, features, limits, active) VALUES
('free', 'Free', '基本的な機能をお楽しみいただけます', 
 '{"ai_requests": false, "export_csv": false, "custom_theme": false, "priority_support": false, "advanced_analytics": false}',
 '{"max_requests_per_month": 0, "max_exports_per_month": 0}',
 true),
('gold', 'Gold', '高度な機能が利用できます',
 '{"ai_requests": true, "export_csv": true, "custom_theme": false, "priority_support": false, "advanced_analytics": false}',
 '{"max_requests_per_month": 100, "max_exports_per_month": 10}',
 true),
('platinum', 'Platinum', 'すべての機能を無制限でご利用いただけます',
 '{"ai_requests": true, "export_csv": true, "custom_theme": true, "priority_support": true, "advanced_analytics": true}',
 '{"max_requests_per_month": -1, "max_exports_per_month": -1}',
 true)
ON CONFLICT (id) DO NOTHING;
