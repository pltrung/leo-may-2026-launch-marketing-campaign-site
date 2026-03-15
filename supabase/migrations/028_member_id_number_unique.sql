-- Each member can have at most one government ID (id_number); ID must be unique across all members.
-- Allows multiple NULLs; enforces uniqueness for non-empty trimmed values.
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_profiles_id_number_unique
  ON member_profiles (TRIM(id_number))
  WHERE id_number IS NOT NULL AND TRIM(id_number) <> '';
