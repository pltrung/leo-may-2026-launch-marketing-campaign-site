-- Allow members to SELECT their own check-ins (required for dashboard realtime subscription)
CREATE POLICY gym_checkins_select_own ON gym_checkins
  FOR SELECT
  USING (
    member_id IN (SELECT id FROM member_profiles WHERE auth_id = auth.uid())
  );

-- Enable realtime for gym_checkins so dashboard can show check-in notice
ALTER PUBLICATION supabase_realtime ADD TABLE gym_checkins;
