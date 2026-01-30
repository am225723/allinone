-- Tasks Management Module
-- Migration: 003_tasks.sql

-- Create status enum
DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create priority enum
DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status task_status DEFAULT 'pending',
  priority task_priority DEFAULT 'normal',
  due_date TIMESTAMPTZ,
  due_time TEXT,
  tags TEXT[] DEFAULT '{}',
  assigned_to TEXT,
  assigned_to_name TEXT,
  recurrence JSONB,
  linked_resource JSONB,
  checklist JSONB DEFAULT '[]',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create tasks history/audit table
CREATE TABLE IF NOT EXISTS tasks_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS tasks_updated_at_trigger ON tasks;
CREATE TRIGGER tasks_updated_at_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- Create audit log trigger function
CREATE OR REPLACE FUNCTION log_task_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO tasks_history (task_id, action, new_values, changed_by)
    VALUES (NEW.id, 'created', row_to_json(NEW), NEW.created_by);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO tasks_history (task_id, action, old_values, new_values, changed_by)
    VALUES (NEW.id, 'updated', row_to_json(OLD), row_to_json(NEW), NEW.created_by);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO tasks_history (task_id, action, old_values, changed_by)
    VALUES (OLD.id, 'deleted', row_to_json(OLD), OLD.created_by);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create audit trigger
DROP TRIGGER IF EXISTS tasks_audit_trigger ON tasks;
CREATE TRIGGER tasks_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_changes();

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks (allow all for now, can be restricted later)
DROP POLICY IF EXISTS tasks_select_policy ON tasks;
CREATE POLICY tasks_select_policy ON tasks FOR SELECT USING (true);

DROP POLICY IF EXISTS tasks_insert_policy ON tasks;
CREATE POLICY tasks_insert_policy ON tasks FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS tasks_update_policy ON tasks;
CREATE POLICY tasks_update_policy ON tasks FOR UPDATE USING (true);

DROP POLICY IF EXISTS tasks_delete_policy ON tasks;
CREATE POLICY tasks_delete_policy ON tasks FOR DELETE USING (true);

-- RLS Policies for tasks_history
DROP POLICY IF EXISTS tasks_history_select_policy ON tasks_history;
CREATE POLICY tasks_history_select_policy ON tasks_history FOR SELECT USING (true);

DROP POLICY IF EXISTS tasks_history_insert_policy ON tasks_history;
CREATE POLICY tasks_history_insert_policy ON tasks_history FOR INSERT WITH CHECK (true);
