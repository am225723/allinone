'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type TaskStatus = 'pending' | 'in_progress' | 'completed';
type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
type ViewMode = 'list' | 'kanban';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface LinkedResource {
  type: 'gmail' | 'openphone' | 'other';
  id: string;
  title?: string;
  url?: string;
}

interface Task {
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
  recurrence: any;
  linked_resource: LinkedResource | null;
  checklist: ChecklistItem[];
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  normal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  high: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const statusColors: Record<TaskStatus, string> = {
  pending: 'bg-gray-500/20 text-gray-400',
  in_progress: 'bg-blue-500/20 text-blue-400',
  completed: 'bg-emerald-500/20 text-emerald-400',
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filters, setFilters] = useState({
    status: '' as string,
    priority: '' as string,
    search: '',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [quickAddText, setQuickAddText] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadTasks();
  }, [filters.status, filters.priority]);

  async function loadTasks() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.search) params.set('search', filters.search);

      const res = await fetch(`/api/tasks?${params.toString()}`);
      const data = await res.json();
      if (data.ok) {
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickAddText.trim()) return;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: quickAddText }),
      });
      const data = await res.json();
      if (data.ok) {
        setQuickAddText('');
        loadTasks();
        setMessage({ type: 'success', text: 'Task created!' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  }

  async function updateTaskStatus(taskId: string, status: TaskStatus) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.ok) {
        loadTasks();
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  }

  async function deleteTask(taskId: string) {
    if (!confirm('Delete this task?')) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        loadTasks();
        setMessage({ type: 'success', text: 'Task deleted!' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  }

  const tasksByStatus = {
    pending: tasks.filter(t => t.status === 'pending'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    completed: tasks.filter(t => t.status === 'completed'),
  };

  const stats = {
    total: tasks.length,
    pending: tasksByStatus.pending.length,
    inProgress: tasksByStatus.in_progress.length,
    completed: tasksByStatus.completed.length,
    overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length,
  };

  return (
    <div className="container py-6">
      <div className="mb-6">
        <Link href="/" className="text-gray-400 hover:text-white text-sm flex items-center gap-1 mb-2">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">task_alt</span>
              Tasks
            </h1>
            <p className="text-gray-400 mt-1">Manage your tasks and stay organized</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <span className="material-symbols-outlined">add</span>
            New Task
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/20 border border-red-500/30 text-red-400'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-sm text-gray-400">Total Tasks</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-gray-400">{stats.pending}</p>
          <p className="text-sm text-gray-400">Pending</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-blue-400">{stats.inProgress}</p>
          <p className="text-sm text-gray-400">In Progress</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-emerald-400">{stats.completed}</p>
          <p className="text-sm text-gray-400">Completed</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-red-400">{stats.overdue}</p>
          <p className="text-sm text-gray-400">Overdue</p>
        </div>
      </div>

      <form onSubmit={handleQuickAdd} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={quickAddText}
            onChange={(e) => setQuickAddText(e.target.value)}
            className="input flex-1"
            placeholder="Quick add task... (e.g., 'Call patient tomorrow at 9am #urgent')"
          />
          <button type="submit" className="btn btn-primary">
            <span className="material-symbols-outlined">add</span>
            Add
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <span className="material-symbols-outlined">view_list</span>
            List
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`btn ${viewMode === 'kanban' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <span className="material-symbols-outlined">view_kanban</span>
            Kanban
          </button>
        </div>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="input"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>

        <select
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
          className="input"
        >
          <option value="">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>

        <button onClick={loadTasks} className="btn btn-secondary">
          <span className="material-symbols-outlined">refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="card p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-gray-500 mb-4">task_alt</span>
              <p className="text-gray-400">No tasks yet. Create your first task!</p>
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={() => setEditingTask(task)}
                onDelete={() => deleteTask(task.id)}
                onStatusChange={(status) => updateTaskStatus(task.id, status)}
              />
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['pending', 'in_progress', 'completed'] as TaskStatus[]).map((status) => (
            <div key={status} className="card p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${status === 'pending' ? 'bg-gray-400' : status === 'in_progress' ? 'bg-blue-400' : 'bg-emerald-400'}`}></span>
                {status === 'pending' ? 'Pending' : status === 'in_progress' ? 'In Progress' : 'Completed'}
                <span className="text-sm text-gray-500">({tasksByStatus[status].length})</span>
              </h3>
              <div className="space-y-3">
                {tasksByStatus[status].map((task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    onEdit={() => setEditingTask(task)}
                    onStatusChange={(newStatus) => updateTaskStatus(task.id, newStatus)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {(showCreateModal || editingTask) && (
        <TaskModal
          task={editingTask}
          onClose={() => {
            setShowCreateModal(false);
            setEditingTask(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingTask(null);
            loadTasks();
          }}
        />
      )}
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete, onStatusChange }: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: TaskStatus) => void;
}) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
  const checklistProgress = task.checklist.length > 0
    ? `${task.checklist.filter(i => i.completed).length}/${task.checklist.length}`
    : null;

  return (
    <div className={`card p-4 hover:bg-surface-highlight transition-colors ${task.status === 'completed' ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-4">
        <button
          onClick={() => onStatusChange(task.status === 'completed' ? 'pending' : 'completed')}
          className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.status === 'completed' ? 'bg-emerald-500 border-emerald-500' : 'border-gray-500 hover:border-emerald-500'}`}
        >
          {task.status === 'completed' && (
            <span className="material-symbols-outlined text-white text-sm">check</span>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                {task.title}
              </h3>
              {task.description && (
                <p className="text-sm text-gray-400 mt-1 line-clamp-2">{task.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`px-2 py-1 rounded text-xs border ${priorityColors[task.priority]}`}>
                {task.priority}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3 text-sm text-gray-400 flex-wrap">
            {task.due_date && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-400' : ''}`}>
                <span className="material-symbols-outlined text-sm">event</span>
                {new Date(task.due_date).toLocaleDateString()}
                {task.due_time && ` at ${task.due_time}`}
              </span>
            )}
            {checklistProgress && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">checklist</span>
                {checklistProgress}
              </span>
            )}
            {task.tags.length > 0 && (
              <div className="flex gap-1">
                {task.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-gray-700 rounded text-xs">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            {task.linked_resource && (
              <Link
                href={task.linked_resource.type === 'gmail' ? '/gmail' : '/openphone'}
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <span className="material-symbols-outlined text-sm">
                  {task.linked_resource.type === 'gmail' ? 'mail' : 'sms'}
                </span>
                {task.linked_resource.title || 'View'}
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-2 hover:bg-black/20 rounded transition-colors">
            <span className="material-symbols-outlined text-sm text-gray-400">edit</span>
          </button>
          <button onClick={onDelete} className="p-2 hover:bg-black/20 rounded transition-colors">
            <span className="material-symbols-outlined text-sm text-gray-400">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function KanbanCard({ task, onEdit, onStatusChange }: {
  task: Task;
  onEdit: () => void;
  onStatusChange: (status: TaskStatus) => void;
}) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <div
      onClick={onEdit}
      className="p-3 bg-black/20 rounded-lg cursor-pointer hover:bg-black/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
        <span className={`px-1.5 py-0.5 rounded text-xs ${priorityColors[task.priority]}`}>
          {task.priority.charAt(0).toUpperCase()}
        </span>
      </div>
      {task.due_date && (
        <p className={`text-xs ${isOverdue ? 'text-red-400' : 'text-gray-400'}`}>
          <span className="material-symbols-outlined text-xs align-middle mr-1">event</span>
          {new Date(task.due_date).toLocaleDateString()}
        </p>
      )}
      <div className="flex gap-1 mt-2">
        {task.status !== 'pending' && (
          <button
            onClick={(e) => { e.stopPropagation(); onStatusChange('pending'); }}
            className="p-1 bg-gray-600/50 rounded text-xs hover:bg-gray-600"
          >
            <span className="material-symbols-outlined text-xs">arrow_back</span>
          </button>
        )}
        {task.status !== 'in_progress' && (
          <button
            onClick={(e) => { e.stopPropagation(); onStatusChange('in_progress'); }}
            className="p-1 bg-blue-600/50 rounded text-xs hover:bg-blue-600"
          >
            <span className="material-symbols-outlined text-xs">play_arrow</span>
          </button>
        )}
        {task.status !== 'completed' && (
          <button
            onClick={(e) => { e.stopPropagation(); onStatusChange('completed'); }}
            className="p-1 bg-emerald-600/50 rounded text-xs hover:bg-emerald-600"
          >
            <span className="material-symbols-outlined text-xs">check</span>
          </button>
        )}
      </div>
    </div>
  );
}

function TaskModal({ task, onClose, onSave }: {
  task: Task | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const isEditing = !!task;
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'pending' as TaskStatus,
    priority: task?.priority || 'normal' as TaskPriority,
    due_date: task?.due_date?.split('T')[0] || '',
    due_time: task?.due_time || '',
    tags: task?.tags.join(', ') || '',
    checklist: task?.checklist || [] as ChecklistItem[],
  });
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        status: form.status,
        priority: form.priority,
        due_date: form.due_date || null,
        due_time: form.due_time || null,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        checklist: form.checklist,
      };

      const url = isEditing ? `/api/tasks/${task.id}` : '/api/tasks';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.ok) {
        onSave();
      }
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setLoading(false);
    }
  }

  async function suggestPriority() {
    setAiLoading('priority');
    try {
      const res = await fetch('/api/tasks/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest_priority',
          title: form.title,
          description: form.description,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setForm({ ...form, priority: data.priority });
      }
    } catch (error) {
      console.error('Error suggesting priority:', error);
    } finally {
      setAiLoading(null);
    }
  }

  async function generateChecklist() {
    setAiLoading('checklist');
    try {
      const res = await fetch('/api/tasks/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'breakdown',
          title: form.title,
          description: form.description,
        }),
      });
      const data = await res.json();
      if (data.ok && data.checklist) {
        setForm({ ...form, checklist: [...form.checklist, ...data.checklist] });
      }
    } catch (error) {
      console.error('Error generating checklist:', error);
    } finally {
      setAiLoading(null);
    }
  }

  function addChecklistItem() {
    if (!newChecklistItem.trim()) return;
    const newItem: ChecklistItem = {
      id: `item-${Date.now()}`,
      text: newChecklistItem,
      completed: false,
    };
    setForm({ ...form, checklist: [...form.checklist, newItem] });
    setNewChecklistItem('');
  }

  function toggleChecklistItem(id: string) {
    setForm({
      ...form,
      checklist: form.checklist.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      ),
    });
  }

  function removeChecklistItem(id: string) {
    setForm({
      ...form,
      checklist: form.checklist.filter(item => item.id !== id),
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-xl font-bold">{isEditing ? 'Edit Task' : 'Create Task'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-black/20 rounded">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input w-full"
              placeholder="Task title"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input w-full"
              rows={3}
              placeholder="Optional description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
                className="input w-full"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Priority</label>
              <div className="flex gap-2">
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
                  className="input flex-1"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <button
                  type="button"
                  onClick={suggestPriority}
                  disabled={!form.title || aiLoading === 'priority'}
                  className="btn btn-secondary"
                  title="AI Suggest Priority"
                >
                  {aiLoading === 'priority' ? (
                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Due Time</label>
              <input
                type="time"
                value={form.due_time}
                onChange={(e) => setForm({ ...form, due_time: e.target.value })}
                className="input w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Tags (comma separated)</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="input w-full"
              placeholder="e.g., patient, urgent, follow-up"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-400">Checklist</label>
              <button
                type="button"
                onClick={generateChecklist}
                disabled={!form.title || aiLoading === 'checklist'}
                className="btn btn-secondary text-xs"
              >
                {aiLoading === 'checklist' ? (
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                )}
                AI Breakdown
              </button>
            </div>
            <div className="space-y-2">
              {form.checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2 p-2 bg-black/20 rounded">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => toggleChecklistItem(item.id)}
                    className="w-4 h-4"
                  />
                  <span className={`flex-1 text-sm ${item.completed ? 'line-through text-gray-500' : ''}`}>
                    {item.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeChecklistItem(item.id)}
                    className="text-gray-400 hover:text-red-400"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                  className="input flex-1"
                  placeholder="Add checklist item"
                />
                <button type="button" onClick={addChecklistItem} className="btn btn-secondary">
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
              {loading ? 'Saving...' : isEditing ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
