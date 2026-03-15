# Realtime setup for dashboard and staff

When a member is checked in (admin/QR) or staff is checked in (admin scans staff QR), the **dashboard** and **/staff** pages should update in real time without refresh. If banners/state don’t update, check the following in Supabase.

## 1. Publication (tables in Realtime)

The tables must be in the `supabase_realtime` publication.

- **Supabase Dashboard** → **Database** → **Replication**
- Find the publication **supabase_realtime**
- Ensure **gym_checkins** and **staff_attendance** are in the list of tables

If they’re missing, run (or re-run) the migrations that add them:

- `021_gym_checkins_realtime.sql` → adds `gym_checkins`
- `026_staff_attendance_realtime.sql` → adds `staff_attendance`
- `027_realtime_replica_identity.sql` → sets `REPLICA IDENTITY FULL` on both (needed for filtered subscriptions)

Or in **SQL Editor**:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE gym_checkins;
ALTER PUBLICATION supabase_realtime ADD TABLE staff_attendance;
ALTER TABLE gym_checkins REPLICA IDENTITY FULL;
ALTER TABLE staff_attendance REPLICA IDENTITY FULL;
```

## 2. Replica identity (for filtered subscriptions)

For **filtered** Realtime subscriptions (e.g. `member_id=eq.xxx`), UPDATE and DELETE events are only delivered correctly if the table has **REPLICA IDENTITY FULL**. Migration `027_realtime_replica_identity.sql` sets this. If you didn’t run it, run the two `ALTER TABLE ... REPLICA IDENTITY FULL` lines above.

## 3. RLS (who can “see” the row)

Realtime only sends an event to a client if that client is allowed to **SELECT** the row (RLS).

- **gym_checkins**: The member must have a policy that allows `SELECT` where `member_id` equals their member profile. Migration `021` adds `gym_checkins_select_own` for that.
- **staff_attendance**: The staff user must have a policy that allows `SELECT` where `staff_id` equals their staff profile. Migration `023` adds `staff_attendance_select_own` for that.

In **Database** → **Tables** → **gym_checkins** / **staff_attendance** → **Policies**, confirm these SELECT policies exist and apply to the correct role/user.

## 4. Realtime enabled for the project

- **Project Settings** → **API** (or **Database**): ensure Realtime is enabled for the project (it usually is by default).

## Quick test

1. **Dashboard**: Log in as a member, open `/dashboard`. In another tab, use **Admin** → Scan QR / check-in that member. The dashboard should show “Checked in successfully” and refresh without reload.
2. **Staff**: Log in on **/staff**, keep the page open. In **Admin**, scan that staff’s QR. The **/staff** page should switch to “You’re checked in for today” and show tasks/sessions without refresh.

If it still doesn’t update, check the browser console (F12 → Console) for Realtime or WebSocket errors.
