DROP INDEX IF EXISTS idx_feedbacks_flagged_at;
ALTER TABLE feedbacks DROP COLUMN IF EXISTS flagged_at;
