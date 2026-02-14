import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="container py-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <span className="material-symbols-outlined text-gray-400 text-3xl">settings</span>
          Settings
        </h1>
        <p className="text-gray-400 mt-1">Configure your unified communications dashboard</p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Account Section */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">person</span>
              Account
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-surface-darker rounded-xl">
              <div>
                <p className="font-medium">Profile</p>
                <p className="text-sm text-gray-400">Manage your account details</p>
              </div>
              <button className="btn btn-secondary btn-sm">Edit</button>
            </div>
            <div className="flex items-center justify-between p-4 bg-surface-darker rounded-xl">
              <div>
                <p className="font-medium">Notifications</p>
                <p className="text-sm text-gray-400">Configure notification preferences</p>
              </div>
              <button className="btn btn-secondary btn-sm">Configure</button>
            </div>
          </div>
        </div>

        {/* OpenPhone Settings */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">sms</span>
              OpenPhone Settings
            </h3>
            <Link href="/openphone/settings" className="btn btn-ghost btn-sm">
              View All
            </Link>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-surface-darker rounded-xl">
              <div>
                <p className="font-medium">API Configuration</p>
                <p className="text-sm text-gray-400">OpenPhone API key and settings</p>
              </div>
              <span className="badge badge-success">Connected</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-surface-darker rounded-xl">
              <div>
                <p className="font-medium">Suppressions</p>
                <p className="text-sm text-gray-400">Manage blocked phones and phrases</p>
              </div>
              <Link href="/openphone/settings" className="btn btn-secondary btn-sm">Manage</Link>
            </div>
            <div className="flex items-center justify-between p-4 bg-surface-darker rounded-xl">
              <div>
                <p className="font-medium">Max Conversations Per Run</p>
                <p className="text-sm text-gray-400">Limit conversations processed per run</p>
              </div>
              <span className="text-lg font-bold">25</span>
            </div>
          </div>
        </div>

        {/* Gmail Settings */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-400">mail</span>
              Gmail Settings
            </h3>
            <Link href="/gmail/settings" className="btn btn-ghost btn-sm">
              View All
            </Link>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-surface-darker rounded-xl">
              <div>
                <p className="font-medium">Connected Accounts</p>
                <p className="text-sm text-gray-400">Manage connected Gmail accounts</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="badge badge-info">2 accounts</span>
                <Link href="/gmail/accounts" className="btn btn-secondary btn-sm">Manage</Link>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-surface-darker rounded-xl">
              <div>
                <p className="font-medium">Triage Rules</p>
                <p className="text-sm text-gray-400">Configure skip rules for senders and subjects</p>
              </div>
              <Link href="/gmail/rules" className="btn btn-secondary btn-sm">Manage</Link>
            </div>
            <div className="flex items-center justify-between p-4 bg-surface-darker rounded-xl">
              <div>
                <p className="font-medium">Default Lookback Period</p>
                <p className="text-sm text-gray-400">Days to scan for new emails</p>
              </div>
              <span className="text-lg font-bold">14 days</span>
            </div>
          </div>
        </div>

        {/* AI Settings */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-400">auto_awesome</span>
              AI Configuration
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-surface-darker rounded-xl">
              <div>
                <p className="font-medium">OpenAI API</p>
                <p className="text-sm text-gray-400">Used for email analysis and draft generation</p>
              </div>
              <span className="badge badge-success">Connected</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-surface-darker rounded-xl">
              <div>
                <p className="font-medium">Perplexity API</p>
                <p className="text-sm text-gray-400">Used for SMS conversation summaries</p>
              </div>
              <span className="badge badge-success">Connected</span>
            </div>
          </div>
        </div>

        {/* Database Settings */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400">database</span>
              Database
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-surface-darker rounded-xl">
              <div>
                <p className="font-medium">Supabase</p>
                <p className="text-sm text-gray-400">Database and authentication</p>
              </div>
              <span className="badge badge-success">Connected</span>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card border-red-500/30">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2 text-red-400">
              <span className="material-symbols-outlined">warning</span>
              Danger Zone
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-xl">
              <div>
                <p className="font-medium">Clear All Data</p>
                <p className="text-sm text-gray-400">Delete all runs, summaries, and drafts</p>
              </div>
              <button className="btn btn-danger btn-sm">Clear Data</button>
            </div>
            <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-xl">
              <div>
                <p className="font-medium">Disconnect All Accounts</p>
                <p className="text-sm text-gray-400">Remove all connected Gmail accounts</p>
              </div>
              <button className="btn btn-danger btn-sm">Disconnect</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}