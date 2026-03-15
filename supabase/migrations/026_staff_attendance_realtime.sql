-- Enable realtime for staff_attendance so /staff page updates when admin scans QR (check-in)
ALTER PUBLICATION supabase_realtime ADD TABLE staff_attendance;
