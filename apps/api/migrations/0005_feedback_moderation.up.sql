-- Feedback moderation support
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMP NULL;
CREATE INDEX IF NOT EXISTS idx_feedbacks_flagged_at ON feedbacks(flagged_at);
