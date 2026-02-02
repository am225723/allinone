'use client';

import BackButton from '@/components/BackButton';

const integrations = [
  {
    id: 'quo',
    name: 'Quo',
    description: 'Voice and SMS communication platform',
    icon: 'sms',
    color: 'bg-primary',
    connected: true,
    settingsUrl: '/openphone/settings'
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Google email integration',
    icon: 'mail',
    color: 'bg-red-500',
    connected: true,
    settingsUrl: '/gmail/accounts'
  },
  {
    id: 'perplexity',
    name: 'Perplexity AI',
    description: 'AI-powered response generation',
    icon: 'psychology',
    color: 'bg-purple-500',
    connected: true
  },
  {
    id: 'onesignal',
    name: 'OneSignal',
    description: 'Push notification service',
    icon: 'notifications',
    color: 'bg-orange-500',
    connected: true
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Team communication',
    icon: 'forum',
    color: 'bg-green-500',
    connected: false
  },
  {
    id: 'calendar',
    name: 'Google Calendar',
    description: 'Calendar integration',
    icon: 'calendar_month',
    color: 'bg-yellow-500',
    connected: false
  }
];

export default function IntegrationsPage() {
  return (
    <div className="container py-6">
      <div className="flex items-center gap-4 mb-6">
        <BackButton href="/settings" label="Back to Settings" />
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted mt-1">Manage connected services and APIs</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => (
          <div key={integration.id} className="card p-5">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl ${integration.color}/20 flex items-center justify-center`}>
                <span className={`material-symbols-outlined ${integration.color.replace('bg-', 'text-').replace('-500', '-400')}`}>
                  {integration.icon}
                </span>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                integration.connected 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {integration.connected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            <h3 className="font-semibold mb-1">{integration.name}</h3>
            <p className="text-sm text-muted mb-4">{integration.description}</p>
            <div className="flex gap-2">
              {integration.connected ? (
                <>
                  {integration.settingsUrl && (
                    <a href={integration.settingsUrl} className="btn btn-secondary text-sm flex-1">
                      Settings
                    </a>
                  )}
                  <button className="btn btn-secondary text-sm text-red-400">
                    Disconnect
                  </button>
                </>
              ) : (
                <button className="btn btn-primary text-sm flex-1">
                  Connect
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
