import { supabaseServer as supabase } from './supabase';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface LinkedResource {
  type: 'gmail' | 'openphone' | 'other';
  id: string;
  title?: string;
  url?: string;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  endDate?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  due_time: string | null;
  tags: string[];
  assigned_to: string | null;
  assigned_to_name: string | null;
  recurrence: RecurrenceRule | null;
  linked_resource: LinkedResource | null;
  checklist: ChecklistItem[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
  due_time?: string;
  tags?: string[];
  assigned_to?: string;
  assigned_to_name?: string;
  recurrence?: RecurrenceRule;
  linked_resource?: LinkedResource;
  checklist?: ChecklistItem[];
  created_by?: string;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  id: string;
}

export interface TaskFilters {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  tags?: string[];
  assigned_to?: string;
  search?: string;
  dueBefore?: string;
  dueAfter?: string;
}

export async function fetchTasks(filters?: TaskFilters): Promise<{ ok: boolean; tasks?: Task[]; error?: string }> {
  try {
    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }

    if (filters?.priority) {
      if (Array.isArray(filters.priority)) {
        query = query.in('priority', filters.priority);
      } else {
        query = query.eq('priority', filters.priority);
      }
    }

    if (filters?.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to);
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters?.dueBefore) {
      query = query.lte('due_date', filters.dueBefore);
    }

    if (filters?.dueAfter) {
      query = query.gte('due_date', filters.dueAfter);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { ok: true, tasks: data as Task[] };
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return { ok: false, error: error.message };
  }
}

export async function fetchTask(id: string): Promise<{ ok: boolean; task?: Task; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return { ok: true, task: data as Task };
  } catch (error: any) {
    console.error('Error fetching task:', error);
    return { ok: false, error: error.message };
  }
}

export async function createTask(input: CreateTaskInput): Promise<{ ok: boolean; task?: Task; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: input.title,
        description: input.description || null,
        status: input.status || 'pending',
        priority: input.priority || 'normal',
        due_date: input.due_date || null,
        due_time: input.due_time || null,
        tags: input.tags || [],
        assigned_to: input.assigned_to || null,
        assigned_to_name: input.assigned_to_name || null,
        recurrence: input.recurrence || null,
        linked_resource: input.linked_resource || null,
        checklist: input.checklist || [],
        created_by: input.created_by || null,
      })
      .select()
      .single();

    if (error) throw error;

    if (input.assigned_to) {
      await createAssignmentNotification(data as Task);
    }

    return { ok: true, task: data as Task };
  } catch (error: any) {
    console.error('Error creating task:', error);
    return { ok: false, error: error.message };
  }
}

export async function updateTask(input: UpdateTaskInput): Promise<{ ok: boolean; task?: Task; error?: string }> {
  try {
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('assigned_to')
      .eq('id', input.id)
      .single();

    const updateData: any = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.due_date !== undefined) updateData.due_date = input.due_date;
    if (input.due_time !== undefined) updateData.due_time = input.due_time;
    if (input.tags !== undefined) updateData.tags = input.tags;
    if (input.assigned_to !== undefined) updateData.assigned_to = input.assigned_to;
    if (input.assigned_to_name !== undefined) updateData.assigned_to_name = input.assigned_to_name;
    if (input.recurrence !== undefined) updateData.recurrence = input.recurrence;
    if (input.linked_resource !== undefined) updateData.linked_resource = input.linked_resource;
    if (input.checklist !== undefined) updateData.checklist = input.checklist;

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', input.id)
      .select()
      .single();

    if (error) throw error;

    if (input.assigned_to && existingTask?.assigned_to !== input.assigned_to) {
      await createAssignmentNotification(data as Task);
    }

    return { ok: true, task: data as Task };
  } catch (error: any) {
    console.error('Error updating task:', error);
    return { ok: false, error: error.message };
  }
}

export async function deleteTask(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { ok: true };
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return { ok: false, error: error.message };
  }
}

export async function bulkUpdateTasks(
  ids: string[],
  updates: Partial<CreateTaskInput>
): Promise<{ ok: boolean; count?: number; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .in('id', ids)
      .select();

    if (error) throw error;

    return { ok: true, count: data?.length || 0 };
  } catch (error: any) {
    console.error('Error bulk updating tasks:', error);
    return { ok: false, error: error.message };
  }
}

export async function bulkDeleteTasks(ids: string[]): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .in('id', ids);

    if (error) throw error;

    return { ok: true };
  } catch (error: any) {
    console.error('Error bulk deleting tasks:', error);
    return { ok: false, error: error.message };
  }
}

async function createAssignmentNotification(task: Task): Promise<void> {
  try {
    await supabase.from('notifications').insert({
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `You have been assigned a new task: "${task.title}"`,
      metadata: {
        task_id: task.id,
        task_title: task.title,
        priority: task.priority,
        due_date: task.due_date,
      },
    });
  } catch (error) {
    console.error('Error creating assignment notification:', error);
  }
}

export async function handleRecurringTask(task: Task): Promise<{ ok: boolean; newTask?: Task; error?: string }> {
  if (!task.recurrence || task.status !== 'completed') {
    return { ok: false, error: 'Task is not recurring or not completed' };
  }

  const { frequency, interval, endDate } = task.recurrence;
  
  let nextDueDate: Date | null = null;
  if (task.due_date) {
    nextDueDate = new Date(task.due_date);
    
    switch (frequency) {
      case 'daily':
        nextDueDate.setDate(nextDueDate.getDate() + interval);
        break;
      case 'weekly':
        nextDueDate.setDate(nextDueDate.getDate() + (interval * 7));
        break;
      case 'monthly':
        nextDueDate.setMonth(nextDueDate.getMonth() + interval);
        break;
    }
  }

  if (endDate && nextDueDate && nextDueDate > new Date(endDate)) {
    return { ok: false, error: 'Recurrence end date reached' };
  }

  const newTaskInput: CreateTaskInput = {
    title: task.title,
    description: task.description || undefined,
    priority: task.priority,
    due_date: nextDueDate?.toISOString(),
    due_time: task.due_time || undefined,
    tags: task.tags,
    assigned_to: task.assigned_to || undefined,
    assigned_to_name: task.assigned_to_name || undefined,
    recurrence: task.recurrence,
    linked_resource: task.linked_resource || undefined,
    checklist: task.checklist.map(item => ({ ...item, completed: false })),
    created_by: task.created_by || undefined,
  };

  return createTask(newTaskInput);
}

export function parseNaturalLanguageTask(input: string): Partial<CreateTaskInput> {
  const result: Partial<CreateTaskInput> = {
    title: input,
  };

  const timePatterns = [
    { regex: /\btomorrow\b/i, days: 1 },
    { regex: /\btoday\b/i, days: 0 },
    { regex: /\bnext week\b/i, days: 7 },
    { regex: /\bin (\d+) days?\b/i, multiplier: 1 },
    { regex: /\bin (\d+) weeks?\b/i, multiplier: 7 },
  ];

  for (const pattern of timePatterns) {
    const match = input.match(pattern.regex);
    if (match) {
      const dueDate = new Date();
      if (pattern.days !== undefined) {
        dueDate.setDate(dueDate.getDate() + pattern.days);
      } else if (pattern.multiplier && match[1]) {
        dueDate.setDate(dueDate.getDate() + (parseInt(match[1]) * pattern.multiplier));
      }
      result.due_date = dueDate.toISOString().split('T')[0];
      result.title = input.replace(pattern.regex, '').trim();
      break;
    }
  }

  const timeMatch = input.match(/\bat\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const period = timeMatch[3]?.toLowerCase();
    
    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    
    result.due_time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    result.title = (result.title || input).replace(/\bat\s+\d{1,2}:?\d{0,2}\s*(am|pm)?/i, '').trim();
  }

  const priorityPatterns = [
    { regex: /\b(urgent|asap|immediately)\b/i, priority: 'urgent' as TaskPriority },
    { regex: /\b(high priority|important)\b/i, priority: 'high' as TaskPriority },
    { regex: /\b(low priority|when possible)\b/i, priority: 'low' as TaskPriority },
  ];

  for (const pattern of priorityPatterns) {
    if (pattern.regex.test(input)) {
      result.priority = pattern.priority;
      result.title = (result.title || input).replace(pattern.regex, '').trim();
      break;
    }
  }

  const tagMatch = input.match(/#(\w+)/g);
  if (tagMatch) {
    result.tags = tagMatch.map(tag => tag.slice(1));
    result.title = (result.title || input).replace(/#\w+/g, '').trim();
  }

  return result;
}

export function getTaskStats(tasks: Task[]): {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  highPriority: number;
  dueToday: number;
} {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  return {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => 
      t.due_date && 
      new Date(t.due_date) < now && 
      t.status !== 'completed'
    ).length,
    highPriority: tasks.filter(t => 
      (t.priority === 'high' || t.priority === 'urgent') && 
      t.status !== 'completed'
    ).length,
    dueToday: tasks.filter(t => 
      t.due_date && 
      t.due_date.startsWith(today) && 
      t.status !== 'completed'
    ).length,
  };
}
