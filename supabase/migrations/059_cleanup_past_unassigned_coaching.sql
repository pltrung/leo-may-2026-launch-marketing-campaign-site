-- Remove past unassigned coaching sessions (dummy/test data).
-- Only sessions that have already ended and were never assigned are deleted.
-- This resets the "unassigned" count so it reflects only today's/future sessions.

DELETE FROM coaching_sessions
WHERE coach_id IS NULL
  AND end_time < now();
