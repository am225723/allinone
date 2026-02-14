import Link from 'next/link';

export default function GmailPage() {
  return (
    <div className="container py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <span className="material-symbols-outlined text-blue-400 text-3xl">mail</span>
            Gmail Communications
          </h1>
          <p className="text-gray-400 mt-1">Triage emails, manage drafts, and configure automation rules</p>
        </div>
        <div className="flex gap-3">
          <a href="/api/gmail/auth" className="btn btn-primary">
            <span className="material-symbols-outlined">add</span>
            Connect Gmail
          </a>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <span className="stat-label">Connected Inboxes</span>
          <span className="stat-value">2</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Drafts Created</span>
          <span className="stat-value text-blue-400">34</span>
        </div>
        <div className="stat-card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <span className="stat-label">High Priority</span>
          <span className="stat-value text-red-400">3</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Last Triage</span>
          <span className="stat-value text-sm">2h ago</span>
        </div>
      </div>

      {/* Main Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Triage Card */}
        <Link href="/gmail/triage" className="card hover:border-blue-500/50 transition-colors group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
              <span className="material-symbols-outlined text-blue-400 text-2xl">filter_alt</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Run Triage</h3>
              <p className="text-gray-400 text-sm">Scan recent emails, analyze priority, and create draft replies automatically.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-blue-400 text-sm font-medium">
            Start triage
            <span className="material-symbols-outlined text-lg ml-1">arrow_forward</span>
          </div>
        </Link>

        {/* Activity Card */}
        <Link href="/gmail/activity" className="card hover:border-blue-500/50 transition-colors group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
              <span className="material-symbols-outlined text-emerald-400 text-2xl">monitoring</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                Activity Log
                <span className="badge badge-success">12 new</span>
              </h3>
              <p className="text-gray-400 text-sm">View processed emails, their summaries, and draft status.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-emerald-400 text-sm font-medium">
            View activity
            <span className="material-symbols-outlined text-lg ml-1">arrow_forward</span>
          </div>
        </Link>

        {/* Rules Card */}
        <Link href="/gmail/rules" className="card hover:border-blue-500/50 transition-colors group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
              <span className="material-symbols-outlined text-purple-400 text-2xl">rule</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Manage Rules</h3>
              <p className="text-gray-400 text-sm">Configure skip rules for senders or subjects to customize triage behavior.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-purple-400 text-sm font-medium">
            Manage rules
            <span className="material-symbols-outlined text-lg ml-1">arrow_forward</span>
          </div>
        </Link>

        {/* Accounts Card */}
        <Link href="/gmail/accounts" className="card hover:border-blue-500/50 transition-colors group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
              <span className="material-symbols-outlined text-amber-400 text-2xl">account_circle</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Connected Accounts</h3>
              <p className="text-gray-400 text-sm">Manage connected Gmail accounts and their settings.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-amber-400 text-sm font-medium">
            Manage accounts
            <span className="material-symbols-outlined text-lg ml-1">arrow_forward</span>
          </div>
        </Link>

        {/* Gmail Drafts Card */}
        <a 
          href="https://mail.google.com/mail/u/0/#drafts" 
          target="_blank" 
          rel="noreferrer"
          className="card hover:border-blue-500/50 transition-colors group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-500/20 flex items-center justify-center group-hover:bg-gray-500/30 transition-colors">
              <span className="material-symbols-outlined text-gray-400 text-2xl">open_in_new</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Open Gmail Drafts</h3>
              <p className="text-gray-400 text-sm">Review and send drafts directly in Gmail.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-gray-400 text-sm font-medium">
            Open Gmail
            <span className="material-symbols-outlined text-lg ml-1">open_in_new</span>
          </div>
        </a>

        {/* Settings Card */}
        <Link href="/gmail/settings" className="card hover:border-blue-500/50 transition-colors group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-500/20 flex items-center justify-center group-hover:bg-gray-500/30 transition-colors">
              <span className="material-symbols-outlined text-gray-400 text-2xl">settings</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Settings</h3>
              <p className="text-gray-400 text-sm">Configure scheduling, lookback period, and other Gmail settings.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-gray-400 text-sm font-medium">
            Manage settings
            <span className="material-symbols-outlined text-lg ml-1">arrow_forward</span>
          </div>
        </Link>
      </div>

      {/* How It Works */}
      <div className="card mt-8">
        <h3 className="card-title mb-6">How Gmail Triage Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-blue-400 text-3xl">link</span>
            </div>
            <h4 className="font-bold mb-2">1. Connect Gmail</h4>
            <p className="text-sm text-gray-400">OAuth keeps credentials secure and easy to revoke anytime.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-emerald-400 text-3xl">auto_awesome</span>
            </div>
            <h4 className="font-bold mb-2">2. Run Triage</h4>
            <p className="text-sm text-gray-400">AI analyzes emails, assigns priority, and creates draft replies.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-purple-400 text-3xl">send</span>
            </div>
            <h4 className="font-bold mb-2">3. Review & Send</h4>
            <p className="text-sm text-gray-400">Review drafts in Gmail and send when ready. You stay in control.</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card mt-8">
        <div className="card-header">
          <h3 className="card-title">Recent Email Activity</h3>
          <Link href="/gmail/activity" className="btn btn-ghost btn-sm">
            View All
          </Link>
        </div>
        <div className="space-y-3">
          {[
            { from: 'john@example.com', subject: 'Project Update Required', priority: 'high', draft: true, time: '10m ago' },
            { from: 'support@vendor.com', subject: 'Your ticket has been updated', priority: 'normal', draft: true, time: '25m ago' },
            { from: 'newsletter@company.com', subject: 'Weekly Digest', priority: 'low', draft: false, time: '1h ago' },
            { from: 'client@business.com', subject: 'Re: Contract Review', priority: 'high', draft: true, time: '2h ago' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                <span className="material-symbols-outlined">mail</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{item.from}</span>
                </div>
                <p className="text-sm text-gray-400 truncate">{item.subject}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex gap-2">
                  <span className={`badge ${
                    item.priority === 'high' ? 'badge-danger' :
                    item.priority === 'normal' ? 'badge-info' : ''
                  }`}>
                    {item.priority}
                  </span>
                  {item.draft && <span className="badge badge-success">Draft</span>}
                </div>
                <span className="text-xs text-gray-500">{item.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}