import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Filter, RefreshCw } from 'lucide-react';
import AttackTypeBadge from './AttackTypeBadge';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function HistoryTable() {
  const [labelFilter, setLabelFilter] = useState('all');
  const [limit, setLimit] = useState(20);
  const [expandedId, setExpandedId] = useState(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['history', labelFilter, limit],
    queryFn: async () => {
      let url = `${API_BASE_URL}/history?limit=${limit}`;
      if (labelFilter !== 'all') {
        url += `&label=${labelFilter}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch history');
      return res.json();
    },
  });

  const analyses = data?.analyses || [];

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="bg-zinc-900/60 rounded-2xl border border-zinc-800/80 shadow-2xl backdrop-blur-xl overflow-hidden">
      {/* Table Header & Controls */}
      <div className="p-6 border-b border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>Analysis History Log</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Historical message scans persisted in PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Label Filter Dropdown */}
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={labelFilter}
              onChange={(e) => setLabelFilter(e.target.value)}
              className="bg-transparent text-zinc-200 outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-zinc-900">All Attack Types</option>
              <option value="benign" className="bg-zinc-900">Benign</option>
              <option value="phishing" className="bg-zinc-900">Phishing</option>
              <option value="impersonation" className="bg-zinc-900">Impersonation</option>
              <option value="urgency_manipulation" className="bg-zinc-900">Urgency Manipulation</option>
              <option value="baiting" className="bg-zinc-900">Baiting</option>
              <option value="pretexting" className="bg-zinc-900">Pretexting</option>
            </select>
          </div>

          {/* Limit Selector */}
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 outline-none cursor-pointer"
          >
            <option value={20} className="bg-zinc-900">Show 20</option>
            <option value={50} className="bg-zinc-900">Show 50</option>
            <option value={100} className="bg-zinc-900">Show 100</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 rounded-xl transition-colors border border-zinc-700"
            title="Refresh History"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <div className="p-16 text-center text-zinc-500 text-xs font-mono">
          Loading analysis history records...
        </div>
      ) : isError ? (
        <div className="p-16 text-center text-zinc-400 text-xs font-mono">
          Failed to load history log from backend.
        </div>
      ) : analyses.length === 0 ? (
        <div className="p-16 text-center text-zinc-500 text-xs font-mono">
          No analysis records found for this filter.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 text-zinc-400 uppercase font-mono tracking-wider text-[11px] border-b border-zinc-800">
              <tr>
                <th className="py-3 px-5">Date & Time</th>
                <th className="py-3 px-5">Source</th>
                <th className="py-3 px-5">Classification</th>
                <th className="py-3 px-5">Risk Score</th>
                <th className="py-3 px-5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {analyses.map((row) => {
                const isExpanded = expandedId === row.id;
                const formattedDate = new Date(row.created_at).toLocaleString();

                return (
                  <React.Fragment key={row.id}>
                    <tr
                      onClick={() => toggleExpand(row.id)}
                      className="hover:bg-zinc-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-5 text-zinc-300 font-mono whitespace-nowrap">
                        {formattedDate}
                      </td>
                      <td className="py-3.5 px-5 text-zinc-300 capitalize font-medium">
                        {row.source || 'unknown'}
                      </td>
                      <td className="py-3.5 px-5">
                        <AttackTypeBadge label={row.label} confidence={row.confidence} />
                      </td>
                      <td className="py-3.5 px-5 font-mono font-bold">
                        <span
                          className={
                            row.risk_score >= 70
                              ? 'text-white'
                              : row.risk_score >= 40
                              ? 'text-zinc-300'
                              : 'text-zinc-500'
                          }
                        >
                          {row.risk_score}/100
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button className="text-zinc-400 hover:text-white p-1">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Inline Expanded Row */}
                    {isExpanded && (
                      <tr className="bg-zinc-950/90 border-b border-zinc-800">
                        <td colSpan={5} className="p-5 text-xs text-zinc-300">
                          <div className="space-y-2">
                            <div className="font-mono text-zinc-400 text-[11px] uppercase tracking-wider font-semibold">
                              AI Reasoning Explanation:
                            </div>
                            <p className="italic bg-zinc-900 p-3.5 rounded-xl border border-zinc-800 text-zinc-200">
                              "{row.llm_reasoning || 'No explanation generated.'}"
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
