-- Member profile photo and government ID fields
ALTER TABLE member_profiles
ADD COLUMN IF NOT EXISTS profile_photo_url text,
ADD COLUMN IF NOT EXISTS id_number text,
ADD COLUMN IF NOT EXISTS date_of_birth date;

COMMENT ON COLUMN member_profiles.profile_photo_url IS 'URL to profile photo (e.g. Supabase Storage public URL)';
COMMENT ON COLUMN member_profiles.id_number IS 'Passport or government ID number';
COMMENT ON COLUMN member_profiles.date_of_birth IS 'Date of birth';

-- Storage bucket for member profile photos (public for display)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'member-photos',
  'member-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage: uploads done via API (service role). Public bucket allows read access to photo URLs.
