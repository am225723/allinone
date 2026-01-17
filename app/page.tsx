import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="container py-6">
      {/* Hero Section */}
      <div className="dashboard-hero">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-gray-400 text-sm font-medium mb-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}
            </p>
            <h1>Good morning, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Agent.</span></h1>
            <p className="mt-2">Manage all your communications from OpenPhone and Gmail in one unified dashboard.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/openphone/run" className="btn btn-primary">
              <span className="material-symbols-outlined text-lg">play_arrow</span>
              New Run
            </Link>
            <Link href="/gmail/triage" className="btn btn-secondary">
              <span className="material-symbols-outlined text-lg">filter_alt</span>
              Triage Emails
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Conversations</span>
            <span className="stat-value">1,240</span>
            <span className="stat-change positive">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              +12% this week
            </span>
          </div>
          <div className="stat-card" style={{ borderColor: 'rgba(230, 59, 25, 0.3)' }}>
            <span className="stat-label flex items-center gap-1">
              <span className="material-symbols-outlined text-primary text-sm">priority_high</span>
              Needs Response
            </span>
            <span className="stat-value text-primary">14</span>
            <span className="text-xs text-gray-400">Across all channels</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Drafts Pending</span>
            <span className="stat-value">8</span>
            <span className="text-xs text-gray-400">Ready for review</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Resolution Rate</span>
            <span className="stat-value text-emerald-400">98%</span>
            <span className="stat-change positive">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Excellent
            </span>
          </div>
        </div>
      </div>

      {/* Channel Tabs */}
      <div className="channel-tabs">
        <button className="channel-tab active">
          <span className="material-symbols-outlined icon">apps</span>
          All Channels
        </button>
        <button className="channel-tab">
          <span className="material-symbols-outlined icon">sms</span>
          OpenPhone SMS
        </button>
        <button className="channel-tab">
          <span className="material-symbols-outlined icon">mail</span>
          Gmail
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Quick Actions */}
        <div className="lg:col-span-1 space-y-6">
          {/* OpenPhone Quick Actions */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">sms</span>
                  OpenPhone
                </h3>
                <p className="card-subtitle">SMS & Voice Communications</p>
              </div>
              <span className="badge badge-primary">Active</span>
            </div>
            <div className="space-y-3">
              <Link href="/openphone/run" className="btn btn-secondary w-full justify-start">
                <span className="material-symbols-outlined">play_arrow</span>
                Start New Run
              </Link>
              <Link href="/openphone/review" className="btn btn-secondary w-full justify-start">
                <span className="material-symbols-outlined">rate_review</span>
                Review Drafts
                <span className="ml-auto badge badge-warning">5</span>
              </Link>
              <Link href="/openphone/summaries" className="btn btn-secondary w-full justify-start">
                <span className="material-symbols-outlined">summarize</span>
                View Summaries
              </Link>
              <Link href="/openphone/history" className="btn btn-secondary w-full justify-start">
                <span className="material-symbols-outlined">history</span>
                Run History
              </Link>
            </div>
          </div>

          {/* Gmail Quick Actions */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-400">mail</span>
                  Gmail
                </h3>
                <p className="card-subtitle">Email Triage & Drafts</p>
              </div>
              <span className="badge badge-info">Connected</span>
            </div>
            <div className="space-y-3">
              <Link href="/gmail/triage" className="btn btn-secondary w-full justify-start">
                <span className="material-symbols-outlined">filter_alt</span>
                Run Triage
              </Link>
              <Link href="/gmail/activity" className="btn btn-secondary w-full justify-start">
                <span className="material-symbols-outlined">monitoring</span>
                Activity Log
                <span className="ml-auto badge badge-success">12 new</span>
              </Link>
              <Link href="/gmail/rules" className="btn btn-secondary w-full justify-start">
                <span className="material-symbols-outlined">rule</span>
                Manage Rules
              </Link>
              <a 
                href="https://mail.google.com/mail/u/0/#drafts" 
                target="_blank" 
                rel="noreferrer"
                className="btn btn-secondary w-full justify-start"
              >
                <span className="material-symbols-outlined">open_in_new</span>
                Open Gmail Drafts
              </a>
            </div>
          </div>
        </div>

        {/* Right Column - Activity Feed */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Recent Activity</h3>
                <p className="card-subtitle">Latest communications across all channels</p>
              </div>
              <Link href="/activity" className="btn btn-ghost btn-sm">
                View All
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>

            <div className="space-y-2">
              {/* SMS Activity */}
              <div className="activity-item border-l-2 border-l-primary">
                <div className="activity-icon sms">
                  <span className="material-symbols-outlined">chat_bubble</span>
                </div>
                <div className="activity-content">
                  <div className="activity-title">Jane Doe - Refund Request</div>
                  <div className="activity-preview">"I understand, but I need the refund processed today..."</div>
                  <div className="activity-meta flex items-center gap-3">
                    <span className="badge badge-warning">Needs Response</span>
                    <span>2 minutes ago</span>
                  </div>
                </div>
              </div>

              {/* Email Activity */}
              <div className="activity-item border-l-2 border-l-blue-500">
                <div className="activity-icon email">
                  <span className="material-symbols-outlined">mail</span>
                </div>
                <div className="activity-content">
                  <div className="activity-title">Mark Smith - Account Issue</div>
                  <div className="activity-preview">"Can you help me reset my 2FA? I lost my phone..."</div>
                  <div className="activity-meta flex items-center gap-3">
                    <span className="badge badge-info">Draft Created</span>
                    <span>15 minutes ago</span>
                  </div>
                </div>
              </div>

              {/* SMS Activity */}
              <div className="activity-item border-l-2 border-l-primary">
                <div className="activity-icon sms">
                  <span className="material-symbols-outlined">chat_bubble</span>
                </div>
                <div className="activity-content">
                  <div className="activity-title">Alex Chen - Appointment Confirmation</div>
                  <div className="activity-preview">"Yes, 3pm works perfectly for me. See you then!"</div>
                  <div className="activity-meta flex items-center gap-3">
                    <span className="badge badge-success">Resolved</span>
                    <span>1 hour ago</span>
                  </div>
                </div>
              </div>

              {/* Email Activity */}
              <div className="activity-item border-l-2 border-l-blue-500">
                <div className="activity-icon email">
                  <span className="material-symbols-outlined">mail</span>
                </div>
                <div className="activity-content">
                  <div className="activity-title">Sarah Johnson - Feature Request</div>
                  <div className="activity-preview">"Is there a roadmap for the new API endpoints?"</div>
                  <div className="activity-meta flex items-center gap-3">
                    <span className="badge">Normal Priority</span>
                    <span>2 hours ago</span>
                  </div>
                </div>
              </div>

              {/* SMS Activity */}
              <div className="activity-item border-l-2 border-l-primary">
                <div className="activity-icon sms">
                  <span className="material-symbols-outlined">chat_bubble</span>
                </div>
                <div className="activity-content">
                  <div className="activity-title">Michael Brown - Billing Question</div>
                  <div className="activity-preview">"Thanks for the quick response! That clears everything up."</div>
                  <div className="activity-meta flex items-center gap-3">
                    <span className="badge badge-success">Sent</span>
                    <span>3 hours ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Response Volume Chart */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Response Volume</h3>
                  <p className="card-subtitle">Last 24 hours</p>
                </div>
                <span className="stat-change positive">
                  <span className="material-symbols-outlined text-sm">trending_up</span>
                  +12%
                </span>
              </div>
              <div className="h-40 bg-surface-darker rounded-lg flex items-end justify-around p-4 gap-2">
                {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 95, 80].map((height, i) => (
                  <div
                    key={i}
                    className="w-full bg-gradient-to-t from-primary/60 to-primary rounded-t"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2 px-2">
                <span>12am</span>
                <span>6am</span>
                <span>12pm</span>
                <span>6pm</span>
              </div>
            </div>

            {/* Channel Distribution */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Channel Distribution</h3>
                  <p className="card-subtitle">This week</p>
                </div>
              </div>
              <div className="flex items-center gap-6 py-4">
                <div className="relative w-28 h-28">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-700"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                    />
                    <path
                      className="text-primary"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeDasharray="65, 100"
                      strokeLinecap="round"
                    />
                    <path
                      className="text-blue-500"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeDasharray="35, 100"
                      strokeDashoffset="-65"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-primary"></span>
                    <span className="text-sm">OpenPhone SMS</span>
                    <span className="text-sm font-bold ml-auto">65%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    <span className="text-sm">Gmail</span>
                    <span className="text-sm font-bold ml-auto">35%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}