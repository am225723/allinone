/**
 * AI Insights Component
 * Displays AI-powered insights for communications
 */

'use client';

import { useState } from 'react';

interface AIInsightsProps {
  text: string;
  context?: string;
}

export default function AIInsights({ text, context }: AIInsightsProps) {
  const [activeTab, setActiveTab] = useState<'sentiment' | 'topics' | 'follow-up' | 'drafts'>('sentiment');
  const [loading, setLoading] = useState(false);
  const [sentiment, setSentiment] = useState<any>(null);
  const [topics, setTopics] = useState<any>(null);
  const [followUp, setFollowUp] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);

  async function analyzeContent(action: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, text, context }),
      });

      const data = await res.json();
      if (data.ok) {
        switch (action) {
          case 'sentiment':
            setSentiment(data.result);
            break;
          case 'topics':
            setTopics(data.result);
            break;
          case 'follow-up':
            setFollowUp(data.result);
            break;
          case 'draft-variations':
            setDrafts(data.result);
            break;
        }
      }
    } catch (error) {
      console.error('Error analyzing:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleTabChange(tab: typeof activeTab) {
    setActiveTab(tab);
    
    // Load data if not already loaded
    if (tab === 'sentiment' && !sentiment) {
      analyzeContent('sentiment');
    } else if (tab === 'topics' && !topics) {
      analyzeContent('topics');
    } else if (tab === 'follow-up' && followUp.length === 0) {
      analyzeContent('follow-up');
    } else if (tab === 'drafts' && drafts.length === 0) {
      analyzeContent('draft-variations');
    }
  }

  function getSentimentColor(sentiment: string) {
    switch (sentiment) {
      case 'positive': return 'text-emerald-400';
      case 'negative': return 'text-red-400';
      default: return 'text-gray-400';
    }
  }

  function getSentimentIcon(sentiment: string) {
    switch (sentiment) {
      case 'positive': return 'sentiment_satisfied';
      case 'negative': return 'sentiment_dissatisfied';
      default: return 'sentiment_neutral';
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title flex items-center gap-2">
          <span className="material-symbols-outlined text-purple-400">psychology</span>
          AI Insights
        </h3>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-700">
        <button
          onClick={() => handleTabChange('sentiment')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'sentiment'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Sentiment
        </button>
        <button
          onClick={() => handleTabChange('topics')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'topics'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Topics
        </button>
        <button
          onClick={() => handleTabChange('follow-up')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'follow-up'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Follow-up
        </button>
        <button
          onClick={() => handleTabChange('drafts')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'drafts'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Draft Variations
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-4xl text-purple-400 animate-spin">
            progress_activity
          </span>
          <p className="mt-2 text-gray-400">Analyzing...</p>
        </div>
      ) : (
        <>
          {/* Sentiment Tab */}
          {activeTab === 'sentiment' && sentiment && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-black/20 rounded-xl">
                <span className={`material-symbols-outlined text-5xl ${getSentimentColor(sentiment.sentiment)}`}>
                  {getSentimentIcon(sentiment.sentiment)}
                </span>
                <div className="flex-1">
                  <p className="text-lg font-medium capitalize">{sentiment.sentiment}</p>
                  <p className="text-sm text-gray-400">
                    Confidence: {Math.round(sentiment.confidence * 100)}%
                  </p>
                </div>
              </div>

              {sentiment.emotions && sentiment.emotions.length > 0 && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Detected Emotions:</p>
                  <div className="flex flex-wrap gap-2">
                    {sentiment.emotions.map((emotion: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                        {emotion}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Topics Tab */}
          {activeTab === 'topics' && topics && (
            <div className="space-y-4">
              {topics.topics && topics.topics.length > 0 && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Main Topics:</p>
                  <div className="flex flex-wrap gap-2">
                    {topics.topics.map((topic: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {topics.entities && topics.entities.length > 0 && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Named Entities:</p>
                  <div className="space-y-2">
                    {topics.entities.map((entity: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-black/20 rounded-lg">
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-xs">
                          {entity.type}
                        </span>
                        <span className="text-sm">{entity.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {topics.keywords && topics.keywords.length > 0 && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Keywords:</p>
                  <div className="flex flex-wrap gap-2">
                    {topics.keywords.map((keyword: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Follow-up Tab */}
          {activeTab === 'follow-up' && followUp.length > 0 && (
            <div className="space-y-3">
              {followUp.map((question, idx) => (
                <div key={idx} className="p-3 bg-black/20 rounded-lg flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-400 mt-0.5">help</span>
                  <p className="text-sm flex-1">{question}</p>
                </div>
              ))}
            </div>
          )}

          {/* Drafts Tab */}
          {activeTab === 'drafts' && drafts.length > 0 && (
            <div className="space-y-4">
              {drafts.map((draft, idx) => (
                <div key={idx} className="p-4 bg-black/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      draft.tone === 'professional' ? 'bg-blue-500/20 text-blue-300' :
                      draft.tone === 'friendly' ? 'bg-emerald-500/20 text-emerald-300' :
                      draft.tone === 'concise' ? 'bg-purple-500/20 text-purple-300' :
                      'bg-amber-500/20 text-amber-300'
                    }`}>
                      {draft.tone}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{draft.draft}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}