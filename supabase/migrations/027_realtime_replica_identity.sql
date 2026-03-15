-- Realtime filtered subscriptions need REPLICA IDENTITY FULL so UPDATE/DELETE
-- events include full row data and the filter (e.g. member_id=eq.x) can match.
-- Without this, only INSERT may be delivered for filtered channels.

ALTER TABLE gym_checkins REPLICA IDENTITY FULL;
ALTER TABLE staff_attendance REPLICA IDENTITY FULL;
