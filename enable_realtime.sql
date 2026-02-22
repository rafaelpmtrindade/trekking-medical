-- Enable Realtime for Atendimentos
-- This ensures the dashboard receives INSERT and UPDATE events.

-- 1. Ensure the table has REPLICA IDENTITY set correctly so UPDATE events contain the full row data
ALTER TABLE atendimentos REPLICA IDENTITY FULL;

-- 2. Add the table to the supabase_realtime publication
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE atendimentos;
