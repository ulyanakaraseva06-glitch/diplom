-- Колонка для URL вложений в чате поддержки (если ещё не добавлена)
ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) DEFAULT '';
