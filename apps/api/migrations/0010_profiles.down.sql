-- Revert 0010: remove the profiles table and all its policies/indexes.
-- Dropping the table cascades to its indexes and policies automatically.
DROP TABLE IF EXISTS profiles;
