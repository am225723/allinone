import Link from 'next/link';

export default function OpenPhonePage() {
  return (
    <div className="container py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-3xl">sms</span>
            OpenPhone Communications
          </h1>
          <p className="text-gray-400 mt-1">Manage SMS conversations, run cleanups, and review draft replies</p>
        </div>
        <Link href="/openphone/run" className="btn btn-primary">
          <span className="material-symbols-outlined">play_arrow</span>
          Start New Run
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <span className="stat-label">Total Conversations</span>
          <span className="stat-value">847</span>
        </div>
        <div className="stat-card" style={{ borderColor: 'rgba(230, 59, 25, 0.3)' }}>
          <span className="stat-label">Needs Response</span>
          <span className="stat-value text-primary">12</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending Drafts</span>
          <span className="stat-value text-amber-400">5</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Sent Today</span>
          <span className="stat-value text-emerald-400">23</span>
        </div>
      </div>

      {/* Main Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Run Card */}
        <Link href="/openphone/run" className="card hover:border-primary/50 transition-colors group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
              <span className="material-symbols-outlined text-primary text-2xl">play_arrow</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Start a Run</h3>
              <p className="text-gray-400 text-sm">Generate summaries and draft replies for a date range. Process conversations and identify those needing responses.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-primary text-sm font-medium">
            Start new run
            <span className="material-symbols-outlined text-lg ml-1">arrow_forward</span>
          </div>
        </Link>

        {/* Review Card */}
        <Link href="/openphone/review" className="card hover:border-primary/50 transition-colors group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
              <span className="material-symbols-outlined text-amber-400 text-2xl">rate_review</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                Review Drafts
                <span className="badge badge-warning">5</span>
              </h3>
              <p className="text-gray-400 text-sm">Approve, reject, or rewrite draft replies before sending. Nothing is sent without your approval.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-amber-400 text-sm font-medium">
            Review pending drafts
            <span className="material-symbols-outlined text-lg ml-1">arrow_forward</span>
          </div>
        </Link>

        {/* Summaries Card */}
        <Link href="/openphone/summaries" className="card hover:border-primary/50 transition-colors group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
              <span className="material-symbols-outlined text-blue-400 text-2xl">summarize</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">View Summaries</h3>
              <p className="text-gray-400 text-sm">Browse conversation summaries grouped by contact. See who needs responses and manage suppressions.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-blue-400 text-sm font-medium">
            View all summaries
            <span className="material-symbols-outlined text-lg ml-1">arrow_forward</span>
          </div>
        </Link>

        {/* History Card */}
        <Link href="/openphone/history" className="card hover:border-primary/50 transition-colors group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
              <span className="material-symbols-outlined text-purple-400 text-2xl">history</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Run History</h3>
              <p className="text-gray-400 text-sm">View past runs, their status, and checkpoints. Resume paused runs or review completed ones.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-purple-400 text-sm font-medium">
            View history
            <span className="material-symbols-outlined text-lg ml-1">arrow_forward</span>
          </div>
        </Link>

        {/* Settings Card */}
        <Link href="/openphone/settings" className="card hover:border-primary/50 transition-colors group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-500/20 flex items-center justify-center group-hover:bg-gray-500/30 transition-colors">
              <span className="material-symbols-outlined text-gray-400 text-2xl">settings</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Settings</h3>
              <p className="text-gray-400 text-sm">Configure suppressions, blocklists, and other OpenPhone-specific settings.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-gray-400 text-sm font-medium">
            Manage settings
            <span className="material-symbols-outlined text-lg ml-1">arrow_forward</span>
          </div>
        </Link>

        {/* Transit Card */}
        <Link href="/openphone/transit" className="card hover:border-primary/50 transition-colors group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
              <span className="material-symbols-outlined text-emerald-400 text-2xl">local_shipping</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Transit Monitor</h3>
              <p className="text-gray-400 text-sm">Create and track transit records. Scan packages and manage deliveries.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-emerald-400 text-sm font-medium">
            Open transit
            <span className="material-symbols-outlined text-lg ml-1">arrow_forward</span>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="card mt-8">
        <div className="card-header">
          <h3 className="card-title">Recent SMS Activity</h3>
          <Link href="/openphone/summaries" className="btn btn-ghost btn-sm">
            View All
          </Link>
        </div>
        <div className="space-y-3">
          {[
            { name: 'Jane Doe', phone: '+1 (555) 123-4567', message: 'I need the refund processed today...', status: 'needs_response', time: '2m ago' },
            { name: 'Mark Smith', phone: '+1 (555) 234-5678', message: 'Thanks for the quick response!', status: 'resolved', time: '15m ago' },
            { name: 'Alex Chen', phone: '+1 (555) 345-6789', message: 'Yes, 3pm works perfectly for me.', status: 'resolved', time: '1h ago' },
            { name: 'Sarah Johnson', phone: '+1 (555) 456-7890', message: 'Can you confirm my appointment?', status: 'pending', time: '2h ago' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {item.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-xs text-gray-500">{item.phone}</span>
                </div>
                <p className="text-sm text-gray-400 truncate">{item.message}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`badge ${
                  item.status === 'needs_response' ? 'badge-warning' :
                  item.status === 'resolved' ? 'badge-success' : ''
                }`}>
                  {item.status === 'needs_response' ? 'Needs Response' :
                   item.status === 'resolved' ? 'Resolved' : 'Pending'}
                </span>
                <span className="text-xs text-gray-500">{item.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}