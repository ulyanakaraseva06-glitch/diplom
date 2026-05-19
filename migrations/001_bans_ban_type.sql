-- Расширение таблицы bans под типы блокировок (если колонок ещё нет)
ALTER TABLE bans ADD COLUMN IF NOT EXISTS ban_type VARCHAR(50) DEFAULT 'full_ban';
ALTER TABLE bans ADD COLUMN IF NOT EXISTS comment TEXT;

UPDATE bans SET ban_type = 'full_ban' WHERE ban_type IS NULL;
