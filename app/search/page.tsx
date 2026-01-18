'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSmartFilters, SearchParams, SearchResult } from '@/lib/search';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [channel, setChannel] = useState<'all' | 'openphone' | 'gmail'>('all');
  const [priority, setPriority] = useState<'high' | 'normal' | 'low' | ''>('');
  const [needsResponse, setNeedsResponse] = useState<boolean | undefined>(undefined);
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const smartFilters = getSmartFilters();

  useEffect(() => {
    if (query.length >= 2) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [query]);

  async function fetchSuggestions() {
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.ok) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  }

  async function handleSearch() {
    setLoading(true);
    setShowSuggestions(false);

    try {
      const params: SearchParams = {
        query: query || undefined,
        channel: channel === 'all' ? undefined : channel,
        priority: priority || undefined,
        needsResponse,
      };

      // Add date range
      if (dateRange !== 'all') {
        const end = new Date();
        let start = new Date();

        if (dateRange === 'today') {
          start.setHours(0, 0, 0, 0);
        } else if (dateRange === 'week') {
          start.setDate(start.getDate() - 7);
        } else if (dateRange === 'month') {
          start.setMonth(start.getMonth() - 1);
        } else if (dateRange === 'custom' && customStartDate && customEndDate) {
          start = new Date(customStartDate);
          end.setTime(new Date(customEndDate).getTime());
        }

        params.dateRange = { start, end };
      }

      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await res.json();
      if (data.ok) {
        setResults(data.results);
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  }

  function applySmartFilter(filterParams: SearchParams) {
    if (filterParams.channel) setChannel(filterParams.channel);
    if (filterParams.priority) setPriority(filterParams.priority);
    if (filterParams.needsResponse !== undefined) setNeedsResponse(filterParams.needsResponse);
    if (filterParams.dateRange) {
      setDateRange('custom');
      setCustomStartDate(filterParams.dateRange.start.toISOString().split('T')[0]);
      setCustomEndDate(filterParams.dateRange.end.toISOString().split('T')[0]);
    }
    
    // Trigger search
    setTimeout(() => handleSearch(), 100);
  }

  function clearFilters() {
    setQuery('');
    setChannel('all');
    setPriority('');
    setNeedsResponse(undefined);
    setDateRange('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setResults([]);
  }

  function formatTimestamp(timestamp: string) {
    const date = new Date(timestamp);
    return date.toLocaleString();
  }

  return (
    <div className="container py-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Search Communications</h1>
        <p className="text-gray-400 mt-1">Search across all your SMS and email communications</p>
      </div>

      {/* Smart Filters */}
      <div className="card mb-6">
        <h3 className="card-title mb-4">Quick Filters</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {smartFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => applySmartFilter(filter.params)}
              className={`p-3 rounded-xl border-2 transition-all hover:scale-105 ${
                filter.color === 'red' ? 'border-red-500/30 bg-red-500/10 hover:border-red-500/50' :
                filter.color === 'amber' ? 'border-amber-500/30 bg-amber-500/10 hover:border-amber-500/50' :
                filter.color === 'blue' ? 'border-blue-500/30 bg-blue-500/10 hover:border-blue-500/50' :
                filter.color === 'purple' ? 'border-purple-500/30 bg-purple-500/10 hover:border-purple-500/50' :
                filter.color === 'emerald' ? 'border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-500/50' :
                'border-gray-500/30 bg-gray-500/10 hover:border-gray-500/50'
              }`}
            >
              <span className={`material-symbols-outlined text-2xl mb-1 ${
                filter.color === 'red' ? 'text-red-400' :
                filter.color === 'amber' ? 'text-amber-400' :
                filter.color === 'blue' ? 'text-blue-400' :
                filter.color === 'purple' ? 'text-purple-400' :
                filter.color === 'emerald' ? 'text-emerald-400' :
                'text-gray-400'
              }`}>
                {filter.icon}
              </span>
              <p className="text-sm font-medium">{filter.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Search Form */}
      <div className="card mb-6">
        <h3 className="card-title mb-4">Advanced Search</h3>
        
        {/* Search Input */}
        <div className="relative mb-4">
          <input
            type="text"
            className="input pl-12"
            placeholder="Search by keyword, topic, or content..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            search
          </span>
          
          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-10">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  className="w-full text-left px-4 py-2 hover:bg-gray-700 first:rounded-t-xl last:rounded-b-xl"
                  onClick={() => {
                    setQuery(suggestion);
                    setShowSuggestions(false);
                  }}
                >
                  <span className="material-symbols-outlined text-sm mr-2 text-gray-400">search</span>
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Channel Filter */}
          <div className="field">
            <label className="label">Channel</label>
            <select className="input" value={channel} onChange={(e) => setChannel(e.target.value as any)}>
              <option value="all">All Channels</option>
              <option value="openphone">OpenPhone / SMS</option>
              <option value="gmail">Gmail</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="field">
            <label className="label">Priority</label>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as any)}>
              <option value="">Any Priority</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Response Filter */}
          <div className="field">
            <label className="label">Response Status</label>
            <select 
              className="input" 
              value={needsResponse === undefined ? '' : needsResponse ? 'yes' : 'no'}
              onChange={(e) => setNeedsResponse(e.target.value === '' ? undefined : e.target.value === 'yes')}
            >
              <option value="">Any Status</option>
              <option value="yes">Needs Response</option>
              <option value="no">No Response Needed</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="field">
            <label className="label">Date Range</label>
            <select className="input" value={dateRange} onChange={(e) => setDateRange(e.target.value as any)}>
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range */}
        {dateRange === 'custom' && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="field">
              <label className="label">Start Date</label>
              <input
                type="date"
                className="input"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="label">End Date</label>
              <input
                type="date"
                className="input"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            className="btn btn-primary flex-1"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Searching...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">search</span>
                Search
              </>
            )}
          </button>
          <button className="btn btn-secondary" onClick={clearFilters}>
            <span className="material-symbols-outlined">clear</span>
            Clear
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            Search Results {results.length > 0 && `(${results.length})`}
          </h3>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-5xl text-primary animate-spin">
              progress_activity
            </span>
            <p className="mt-4 text-gray-400">Searching...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <span className="material-symbols-outlined text-6xl mb-4">search_off</span>
            <p className="text-lg">No results found</p>
            <p className="text-sm mt-2">Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((result) => (
              <Link
                key={result.id}
                href={result.type === 'openphone' ? `/openphone/summaries` : `/gmail/activity`}
                className="block p-4 bg-black/20 rounded-xl hover:bg-black/30 transition-colors border border-transparent hover:border-primary/30"
              >
                <div className="flex items-start gap-4">
                  <span className={`material-symbols-outlined text-3xl ${
                    result.type === 'openphone' ? 'text-primary' : 'text-blue-400'
                  }`}>
                    {result.type === 'openphone' ? 'phone' : 'mail'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold truncate">{result.title}</h4>
                      {result.priority === 'high' && (
                        <span className="material-symbols-outlined text-red-400 text-sm">
                          priority_high
                        </span>
                      )}
                      {result.needsResponse && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                          Needs Response
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-2 mb-2">{result.preview}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{formatTimestamp(result.timestamp)}</span>
                      {result.tags && result.tags.length > 0 && (
                        <div className="flex gap-1">
                          {result.tags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-gray-700 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}