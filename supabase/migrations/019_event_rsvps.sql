-- Event RSVPs for dashboard upcoming events
CREATE TABLE IF NOT EXISTS event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  member_id uuid NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_id ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_member_id ON event_rsvps(member_id);

COMMENT ON TABLE event_rsvps IS 'RSVPs for dashboard upcoming events (event_id matches DASHBOARD_EVENTS id)';
