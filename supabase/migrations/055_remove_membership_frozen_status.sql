-- Membership "freeze" feature removed: reactivate any frozen profiles as active.
UPDATE member_profiles
SET membership_status = 'active', updated_at = now()
WHERE membership_status = 'frozen';
