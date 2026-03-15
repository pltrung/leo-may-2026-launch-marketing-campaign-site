-- Allow staff to update their own profile (e.g. display_name)
CREATE POLICY staff_profiles_update_own ON staff_profiles
  FOR UPDATE USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);
