-- Climbing progression: streak columns on member_profiles
ALTER TABLE member_profiles
  ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_checkin_date date;

COMMENT ON COLUMN member_profiles.current_streak IS 'Consecutive days with at least one check-in';
COMMENT ON COLUMN member_profiles.best_streak IS 'Longest streak ever';
COMMENT ON COLUMN member_profiles.last_checkin_date IS 'Date (local) of most recent check-in for streak calculation';

-- Achievements definition table
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  name_vi text,
  description text,
  description_vi text,
  icon text NOT NULL DEFAULT '🏆',
  category text NOT NULL DEFAULT 'visits',
  requirement_type text NOT NULL,
  requirement_value integer,
  requirement_meta jsonb,
  reward text,
  reward_vi text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_achievements_code ON achievements (code);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements (category);

-- Member-earned achievements
CREATE TABLE IF NOT EXISTS member_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_member_achievements_member_id ON member_achievements (member_id);
CREATE INDEX IF NOT EXISTS idx_member_achievements_earned_at ON member_achievements (earned_at DESC);

ALTER TABLE member_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY member_achievements_select_own ON member_achievements
  FOR SELECT
  USING (
    member_id IN (SELECT id FROM member_profiles WHERE auth_id = auth.uid())
  );

-- Realtime so dashboard can show achievement unlock when earned after check-in
ALTER PUBLICATION supabase_realtime ADD TABLE member_achievements;

-- Seed achievements (idempotent: insert only if code not exists)
INSERT INTO achievements (code, name, name_vi, description, description_vi, icon, category, requirement_type, requirement_value, reward, reward_vi, display_order)
VALUES
  ('FIRST_CLIMB', 'First Climb', 'Lần leo đầu', 'Complete your first check-in at Leo Mây', 'Hoàn thành lần check-in đầu tiên tại Leo Mây', '🎉', 'visits', 'total_visits', 1, null, null, 10),
  ('VISIT_10', '10 Visits', '10 lượt leo', 'Reach 10 lifetime visits', 'Đạt 10 lượt leo', '☁️', 'visits', 'total_visits', 10, 'Free chalk', 'Phấn miễn phí', 20),
  ('VISIT_25', '25 Visits', '25 lượt leo', 'Reach 25 lifetime visits', 'Đạt 25 lượt leo', '🌤️', 'visits', 'total_visits', 25, 'Free day pass', 'Vé ngày miễn phí', 30),
  ('VISIT_50', '50 Visits', '50 lượt leo', 'Reach 50 lifetime visits', 'Đạt 50 lượt leo', '⛅', 'visits', 'total_visits', 50, 'Leo Mây shirt', 'Áo Leo Mây', 40),
  ('VISIT_100', '100 Visits', '100 lượt leo', 'Reach 100 lifetime visits', 'Đạt 100 lượt leo', '🌟', 'visits', 'total_visits', 100, 'Membership discount', 'Giảm giá thẻ thành viên', 50),
  ('STREAK_3', '3-Day Streak', 'Chuỗi 3 ngày', 'Check in 3 days in a row', 'Check-in 3 ngày liên tiếp', '🔥', 'streak', 'streak_days', 3, null, null, 60),
  ('STREAK_7', '7-Day Streak', 'Chuỗi 7 ngày', 'Check in 7 days in a row', 'Check-in 7 ngày liên tiếp', '🔥', 'streak', 'streak_days', 7, null, null, 70),
  ('STREAK_30', '30-Day Streak', 'Chuỗi 30 ngày', 'Check in 30 days in a row', 'Check-in 30 ngày liên tiếp', '🔥', 'streak', 'streak_days', 30, null, null, 80),
  ('NIGHT_CLIMBER', 'Night Climber', 'Leo đêm', 'Check in after 6 PM', 'Check-in sau 18h', '🌙', 'time', 'checkin_hour_min', 18, null, null, 90),
  ('EARLY_BIRD', 'Early Bird', 'Dậy sớm', 'Check in before 10 AM', 'Check-in trước 10h sáng', '🌅', 'time', 'checkin_hour_max', 10, null, null, 100),
  ('WEEKEND_WARRIOR', 'Weekend Warrior', 'Chiến binh cuối tuần', 'Check in on a Saturday or Sunday', 'Check-in vào thứ Bảy hoặc Chủ nhật', '📅', 'day', 'checkin_weekend', 1, null, null, 110)
ON CONFLICT (code) DO NOTHING;
