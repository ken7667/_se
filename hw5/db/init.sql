-- 由 PostgreSQL 容器第一次啟動時自動執行
CREATE TABLE IF NOT EXISTS messages (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO messages (name, content) VALUES
  ('系統', '歡迎來到 Docker 微服務展示！這筆資料是資料庫初始化時寫入的。'),
  ('nginx', '你的請求會先經過我這個反向代理，再轉給 Node.js API。');
