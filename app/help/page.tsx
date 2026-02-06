'use client';

import BackButton from '@/components/BackButton';

export default function HelpPage() {
  return (
    <div className="container py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <span className="material-symbols-outlined text-blue-400">help</span>
          Help & Support
        </h1>
        <p className="text-gray-400 mt-1">Common questions and support resources</p>
      </div>

      <div className="space-y-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer list-none py-3 border-b border-white/10 group-open:border-transparent">
                <span className="font-medium">How do I reset my PIN?</span>
                <span className="material-symbols-outlined transform group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              <div className="text-gray-400 mt-2 pb-4 border-b border-white/10">
                You can reset your PIN in the Settings &gt; Security section. If you are locked out, please contact the system administrator.
              </div>
            </details>
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer list-none py-3 border-b border-white/10 group-open:border-transparent">
                <span className="font-medium">How often is data synced?</span>
                <span className="material-symbols-outlined transform group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              <div className="text-gray-400 mt-2 pb-4 border-b border-white/10">
                OpenPhone data is synced every hour. Gmail emails are triaged every 4 hours. You can trigger manual syncs from the Admin Dashboard.
              </div>
            </details>
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer list-none py-3 border-b border-white/10 group-open:border-transparent">
                <span className="font-medium">How does the AI drafting work?</span>
                <span className="material-symbols-outlined transform group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              <div className="text-gray-400 mt-2 pb-4 border-b border-white/10">
                We use advanced AI models to analyze the conversation history and generate draft replies. These drafts are never sent automatically; you must review and approve them first.
              </div>
            </details>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Contact Support</h2>
          <p className="text-gray-400 mb-4">
            If you need further assistance, please reach out to our support team.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a href="mailto:support@example.com" className="btn btn-secondary flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">mail</span>
              Email Support
            </a>
            <a href="tel:+15551234567" className="btn btn-secondary flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">call</span>
              Call Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
