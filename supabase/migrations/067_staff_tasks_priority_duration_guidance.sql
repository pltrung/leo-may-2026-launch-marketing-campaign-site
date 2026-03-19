-- Add priority, estimated duration, and step-by-step guidance to staff tasks
-- Note: Add columns separately from CHECK to avoid PostgreSQL bug with ADD COLUMN IF NOT EXISTS + CHECK

ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium';
ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS estimated_duration_minutes integer;
ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS guidance text;

-- Add CHECK constraint separately (avoids duplicate-constraint bug on re-runs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.staff_tasks'::regclass AND conname = 'staff_tasks_priority_check'
  ) THEN
    ALTER TABLE staff_tasks ADD CONSTRAINT staff_tasks_priority_check
      CHECK (priority IN ('high', 'medium', 'low'));
  END IF;
END $$;

COMMENT ON COLUMN staff_tasks.priority IS 'high = urgent/safety, medium = important, low = routine';
COMMENT ON COLUMN staff_tasks.estimated_duration_minutes IS 'Estimated time to complete task';
COMMENT ON COLUMN staff_tasks.guidance IS 'Step-by-step instructions when staff opens the task';

-- Update existing tasks with priority, duration, and guidance
UPDATE staff_tasks SET
  priority = CASE
    WHEN title IN ('Inspect anchors', 'Inspect crash pads', 'Lock main entrance door', 'Check security cameras') THEN 'high'
    WHEN title IN ('Clean holds', 'Check rental shoes', 'Prepare front desk POS', 'Sanitize rental shoes', 'Turn off lights') THEN 'medium'
    ELSE 'low'
  END,
  estimated_duration_minutes = CASE
    WHEN title IN ('Turn on gym lights', 'Start music system', 'Turn off music system', 'Turn off lights') THEN 2
    WHEN title IN ('Inspect anchors', 'Lock main entrance door', 'Check security cameras') THEN 5
    WHEN title IN ('Check bathrooms', 'Check bathrooms regularly', 'Brush volumes', 'Check rental shoes', 'Inspect crash pads') THEN 10
    WHEN title IN ('Clean holds', 'Clean lounge and seating areas', 'Sweep climbing floor (day)', 'Sweep climbing floor (close)', 'Clean front desk') THEN 15
    WHEN title IN ('Prepare front desk POS', 'Monitor rental shoes', 'Restock chalk and merchandise', 'Sanitize rental shoes') THEN 10
    WHEN title IN ('Check lost items area (day)', 'Check lost and found (close)') THEN 5
    ELSE 10
  END,
  guidance = CASE
    WHEN title = 'Clean holds' THEN '1. Gather brush and cleaning supplies. 2. Start from top holds and work down. 3. Brush chalk buildup off each hold. 4. Wipe with damp cloth if needed. 5. Return supplies to storage.'
    WHEN title = 'Inspect anchors' THEN '1. Walk each wall section. 2. Check anchor bolts for looseness. 3. Check quickdraws and carabiners for wear. 4. Tag any damaged equipment and report. 5. Note findings in log if required.'
    WHEN title = 'Brush volumes' THEN '1. Get a large brush. 2. Brush all climbing volumes to remove chalk and dust. 3. Focus on textured surfaces. 4. Return brush to storage.'
    WHEN title = 'Check rental shoes' THEN '1. Count all rental shoes. 2. Check for damage (rips, missing soles). 3. Ensure they are sanitized. 4. Arrange by size. 5. Note any missing pairs.'
    WHEN title = 'Inspect crash pads' THEN '1. Inspect each crash pad for tears. 2. Check foam for shifting or collapse. 3. Ensure straps are secure. 4. Tag damaged pads for repair. 5. Arrange pads in designated areas.'
    WHEN title = 'Check bathrooms' THEN '1. Check toilet paper supply. 2. Refill soap dispensers. 3. Restock paper towels. 4. Wipe counters and sinks. 5. Report any plumbing issues.'
    WHEN title = 'Turn on gym lights' THEN '1. Locate light switches/panel. 2. Turn on climbing wall lights. 3. Turn on lounge lighting. 4. Turn on reception area lights.'
    WHEN title = 'Start music system' THEN '1. Turn on music system/amp. 2. Select appropriate playlist. 3. Set volume to comfortable level. 4. Verify speakers working.'
    WHEN title = 'Prepare front desk POS' THEN '1. Power on POS terminal. 2. Open admin dashboard on desk computer. 3. Verify network connection. 4. Test a sample transaction if needed. 5. Ensure receipt printer has paper.'
    WHEN title = 'Monitor rental shoes' THEN '1. Check rental area for returned shoes. 2. Sanitize returned shoes. 3. Place back in size order. 4. Restock if low. 5. Log rental count if required.'
    WHEN title = 'Restock chalk and merchandise' THEN '1. Check chalk bins and bags. 2. Restock from inventory. 3. Check merchandise shelves. 4. Refill tape, grips, etc. 5. Note low stock for reorder.'
    WHEN title = 'Check bathrooms regularly' THEN '1. Inspect toilets, sinks, mirrors. 2. Refill supplies as needed. 3. Wipe any spills. 4. Report issues.'
    WHEN title = 'Clean lounge and seating areas' THEN '1. Remove trash and empty bins. 2. Wipe tables and surfaces. 3. Straighten cushions and furniture. 4. Sweep floor if needed.'
    WHEN title = 'Sweep climbing floor (day)' THEN '1. Get broom and dustpan. 2. Sweep chalk dust from climbing floor. 3. Focus on high-traffic areas. 4. Empty dustpan. 5. Return supplies.'
    WHEN title = 'Check lost items area (day)' THEN '1. Check front desk lost & found. 2. Move any found items to storage. 3. Log items if required. 4. Keep area organized.'
    WHEN title = 'Check lost and found (close)' THEN '1. Gather any items left in gym. 2. Move to lost and found storage. 3. Log items with date. 4. Secure storage area.'
    WHEN title = 'Sanitize rental shoes' THEN '1. Collect all returned rental shoes. 2. Spray disinfectant on insoles and interiors. 3. Allow to dry. 4. Place back in storage by size.'
    WHEN title = 'Sweep climbing floor (close)' THEN '1. Sweep all climbing areas. 2. Empty dustpan. 3. Mop if scheduled. 4. Return supplies.'
    WHEN title = 'Clean front desk' THEN '1. Organize paperwork and supplies. 2. Wipe down counter. 3. Shut down POS properly. 4. Lock cash drawer if applicable.'
    WHEN title = 'Turn off music system' THEN '1. Lower volume. 2. Stop playback. 3. Power off amp/system.'
    WHEN title = 'Turn off lights' THEN '1. Turn off climbing wall lights. 2. Turn off lounge lights. 3. Leave emergency/pathway lights on if required.'
    WHEN title = 'Lock main entrance door' THEN '1. Ensure all members have left. 2. Lock main entrance. 3. Check side doors. 4. Verify locks engaged.'
    WHEN title = 'Check security cameras' THEN '1. Verify camera feeds are active. 2. Check DVR/recording is running. 3. Test alarm system if applicable. 4. Report any issues.'
    ELSE NULL
  END
WHERE guidance IS NULL OR estimated_duration_minutes IS NULL;
