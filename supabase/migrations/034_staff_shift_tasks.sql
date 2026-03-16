-- Shift-based staff tasks for Leo Mây
-- - Adds time-of-day fields and block grouping to staff_tasks
-- - Creates task_logs table for per-day completion history
-- - Seeds three shift groups: pre-open, during-hours, closing

-- 1) Extend staff_tasks with shift metadata
ALTER TABLE staff_tasks
  ADD COLUMN IF NOT EXISTS block text CHECK (block IN ('pre_open', 'during_hours', 'closing')),
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS due_time time,
  ADD COLUMN IF NOT EXISTS completed_by uuid REFERENCES staff_profiles(id) ON DELETE SET NULL;

-- 2) task_logs table to preserve history when tasks reset daily
CREATE TABLE IF NOT EXISTS task_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES staff_tasks(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  completed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_logs_task_id ON task_logs (task_id);
CREATE INDEX IF NOT EXISTS idx_task_logs_staff_id_date ON task_logs (staff_id, date);

-- 3) Seed shift-based tasks (idempotent; clears old simple tasks once)
DO $$
BEGIN
  -- If tasks still in the old schema (no block/start_time), clear and reseed.
  IF EXISTS (SELECT 1 FROM staff_tasks WHERE block IS NULL OR start_time IS NULL OR due_time IS NULL) THEN
    DELETE FROM staff_tasks;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM staff_tasks) THEN
    -- PRE-OPEN TASKS: 09:00–10:00
    INSERT INTO staff_tasks (title, description, block, start_time, due_time, status)
    VALUES
      ('Clean holds', 'Brush and clean all climbing holds on the main walls to remove chalk buildup and maintain grip quality.', 'pre_open', '09:00'::time, '10:00'::time, 'pending'),
      ('Inspect anchors', 'Check anchor points and fixed hardware for wear or looseness to ensure climber safety.', 'pre_open', '09:00'::time, '10:00'::time, 'pending'),
      ('Brush volumes', 'Clean all large climbing volumes to remove chalk and dust buildup.', 'pre_open', '09:00'::time, '10:00'::time, 'pending'),
      ('Check rental shoes', 'Count rental shoes, check for damage, and ensure they are sanitized and ready for customers.', 'pre_open', '09:00'::time, '10:00'::time, 'pending'),
      ('Inspect crash pads', 'Check all crash pads for tears, shifting foam, or safety issues.', 'pre_open', '09:00'::time, '10:00'::time, 'pending'),
      ('Check bathrooms', 'Ensure bathrooms are clean, stocked with toilet paper, soap, and paper towels.', 'pre_open', '09:00'::time, '10:00'::time, 'pending'),
      ('Turn on gym lights', 'Turn on all climbing wall lights, lounge lighting, and reception area lighting.', 'pre_open', '09:00'::time, '10:00'::time, 'pending'),
      ('Start music system', 'Turn on the gym music system and ensure volume levels are appropriate.', 'pre_open', '09:00'::time, '10:00'::time, 'pending'),
      ('Prepare front desk POS', 'Ensure the POS system and admin dashboard are running and ready to process check-ins and purchases.', 'pre_open', '09:00'::time, '10:00'::time, 'pending');

    -- DURING GYM HOURS: 10:00–22:00
    INSERT INTO staff_tasks (title, description, block, start_time, due_time, status)
    VALUES
      ('Monitor rental shoes', 'Ensure returned rental shoes are placed correctly and new rentals are available for members.', 'during_hours', '10:00'::time, '22:00'::time, 'pending'),
      ('Restock chalk and merchandise', 'Check chalk bins, chalk bags, tape, and merchandise shelves and restock if necessary.', 'during_hours', '10:00'::time, '22:00'::time, 'pending'),
      ('Check bathrooms regularly', 'Inspect bathrooms every few hours to ensure cleanliness and restock supplies if needed.', 'during_hours', '10:00'::time, '22:00'::time, 'pending'),
      ('Clean lounge and seating areas', 'Tidy the seating area, remove trash, and wipe tables.', 'during_hours', '10:00'::time, '22:00'::time, 'pending'),
      ('Sweep climbing floor (day)', 'Sweep chalk dust and debris from the climbing floor to maintain safety.', 'during_hours', '10:00'::time, '22:00'::time, 'pending'),
      ('Check lost items area (day)', 'Move any found items to the lost and found area at the front desk.', 'during_hours', '10:00'::time, '22:00'::time, 'pending');

    -- CLOSING TASKS: 22:00–23:00
    INSERT INTO staff_tasks (title, description, block, start_time, due_time, status)
    VALUES
      ('Check lost and found (close)', 'Gather any remaining items left in the gym and move them to the lost and found storage area.', 'closing', '22:00'::time, '23:00'::time, 'pending'),
      ('Sanitize rental shoes', 'Spray and disinfect all returned rental shoes to prepare them for the next day.', 'closing', '22:00'::time, '23:00'::time, 'pending'),
      ('Sweep climbing floor (close)', 'Sweep chalk dust and debris from the floor across all climbing areas.', 'closing', '22:00'::time, '23:00'::time, 'pending'),
      ('Clean front desk', 'Organize and clean the reception area and ensure POS equipment is shut down properly.', 'closing', '22:00'::time, '23:00'::time, 'pending'),
      ('Turn off music system', 'Shut down the gym audio system.', 'closing', '22:00'::time, '23:00'::time, 'pending'),
      ('Turn off lights', 'Turn off all non-essential lighting in the gym.', 'closing', '22:00'::time, '23:00'::time, 'pending'),
      ('Lock main entrance door', 'Ensure the main entrance door and all side doors are securely locked.', 'closing', '22:00'::time, '23:00'::time, 'pending'),
      ('Check security cameras', 'Verify that security cameras and alarm systems are active.', 'closing', '22:00'::time, '23:00'::time, 'pending');
  END IF;
END $$;

