import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, BarChart3, Download, Search, Filter, Star, Crown, AlertCircle, Clock, FileText } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { createExportService } from '../services/exportService';
import { secureLog, handleError } from '../utils/errorHandler';

interface RewriteHistoryItem {
  id: string;
  original_text: string;
  rewritten_text: string;
  confidence: number;
  style_tags: string[];
  created_at: string;
}

interface RewriteHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPricing?: () => void;
}

export default function RewriteHistoryModal({ isOpen, onClose, onOpenPricing }: RewriteHistoryModalProps) {
  const [history, setHistory] = useState<RewriteHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<RewriteHistoryItem | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'confidence'>('date');
  const [filterTag, setFilterTag] = useState<string>('');
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 20;

  const { user, updateExports } = useAuth();

  // Create export service instance
  const exportService = useMemo(() => createExportService(updateExports), [updateExports]);

  useEffect(() => {
    if (isOpen && user) {
      loadHistory();
    }
  }, [isOpen, user]);

  const loadHistory = async (newPage = 0) => {
    if (!user) return;

    setLoading(true);
    try {
      // Implement pagination
      const start = newPage * pageSize;
      const end = start + pageSize - 1;
      
      const { data, error, count } = await supabase
        .from('rewrite_history')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) {
        throw error;
      }

      if (newPage === 0) {
        setHistory(data || []);
      } else {
        setHistory(prev => [...prev, ...(data || [])]);
      }
      
      setPage(newPage);
      setHasMore((data?.length || 0) === pageSize);
      
    } catch (error) {
      const appError = handleError(error, 'load_history');
      secureLog('Exception loading rewrite history:', { error: appError.message });
    } finally {
      setLoading(false);
    }
  };

  const loadMoreHistory = () => {
    if (hasMore && !loading) {
      loadHistory(page + 1);
    }
  };

  const handleExportHistory = async () => {
    if (!user || history.length === 0) return;

    secureLog('Exporting full history:', {
      userTier: user.subscription_tier,
      currentExports: user.monthly_exports_used,
      historyCount: history.length
    });

    try {
      // Check export limits before proceeding
      if (user.subscription_tier === 'free') {
        const monthlyExportsUsed = user.monthly_exports_used || 0;
        if (monthlyExportsUsed >= 5) {
          alert('You have reached your monthly export limit of 5. Upgrade to Pro or Premium for more exports.');
          return;
        }
      } else if (user.subscription_tier === 'pro') {
        const monthlyExportsUsed = user.monthly_exports_used || 0;
        if (monthlyExportsUsed >= 200) {
          alert('You have reached your monthly export limit of 200. Upgrade to Premium for unlimited exports.');
          return;
        }
      }
      // Premium users have unlimited exports

      const exportData = {
        user: user.email,
        subscription_tier: user.subscription_tier,
        export_date: new Date().toISOString(),
        total_rewrites: history.length,
        analytics: user.subscription_tier === 'premium' ? {
          avg_confidence: history.reduce((sum, item) => sum + item.confidence, 0) / history.length,
          most_common_tags: getMostCommonTags(),
          monthly_breakdown: getMonthlyBreakdown(),
          style_evolution: getStyleEvolution()
        } : null,
        history: history.map(item => ({
          id: item.id,
          date: item.created_at,
          confidence: item.confidence,
          style_tags: item.style_tags,
          original_preview: item.original_text.substring(0, 100) + '...',
          rewritten_preview: item.rewritten_text.substring(0, 100) + '...',
          ...(user.subscription_tier === 'premium' && {
            full_original: item.original_text,
            full_rewritten: item.rewritten_text
          })
        }))
      };

      const filename = `rewrite-history-${user.subscription_tier}-${new Date().toISOString().split('T')[0]}.json`;
      
      // Use centralized export service
      await exportService.exportData(exportData, filename, user);
      
      secureLog('History export completed successfully');
    } catch (error) {
      const appError = handleError(error, 'export_history');
      secureLog('History export failed:', { error: appError.message });
      alert(appError.message);
    }
  };

  const handleExportSingleItem = async (item: RewriteHistoryItem) => {
    if (!user) return;

    secureLog('Exporting single history item:', {
      userTier: user.subscription_tier,
      currentExports: user.monthly_exports_used,
      itemId: item.id
    });

    setExportingId(item.id);

    try {
      // Check export limits before proceeding
      if (user.subscription_tier === 'free') {
        const monthlyExportsUsed = user.monthly_exports_used || 0;
        if (monthlyExportsUsed >= 5) {
          alert('You have reached your monthly export limit of 5. Upgrade to Pro or Premium for more exports.');
          return;
        }
      } else if (user.subscription_tier === 'pro') {
        const monthlyExportsUsed = user.monthly_exports_used || 0;
        if (monthlyExportsUsed >= 200) {
          alert('You have reached your monthly export limit of 200. Upgrade to Premium for unlimited exports.');
          return;
        }
      }
      // Premium users have unlimited exports

      const exportData = {
        user: user.email,
        subscription_tier: user.subscription_tier,
        export_date: new Date().toISOString(),
        export_type: 'single_rewrite',
        rewrite: {
          id: item.id,
          date: item.created_at,
          confidence: item.confidence,
          style_tags: item.style_tags,
          original_text: user.subscription_tier === 'premium' ? item.original_text : item.original_text.substring(0, 500) + '...',
          rewritten_text: user.subscription_tier === 'premium' ? item.rewritten_text : item.rewritten_text.substring(0, 500) + '...',
          word_count_original: item.original_text.split(' ').length,
          word_count_rewritten: item.rewritten_text.split(' ').length
        }
      };

      const filename = `rewrite-${item.id.substring(0, 8)}-${new Date().toISOString().split('T')[0]}.json`;
      
      // Use centralized export service
      await exportService.exportData(exportData, filename, user);
      
      secureLog('Single item export completed successfully');
    } catch (error) {
      const appError = handleError(error, 'export_single_item');
      secureLog('Single item export failed:', { error: appError.message });
      alert(appError.message);
    } finally {
      setExportingId(null);
    }
  };

  const getMostCommonTags = () => {
    const tagCounts: Record<string, number> = {};
    history.forEach(item => {
      item.style_tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));
  };

  const getMonthlyBreakdown = () => {
    const monthlyData: Record<string, number> = {};
    history.forEach(item => {
      const month = new Date(item.created_at).toISOString().substring(0, 7);
      monthlyData[month] = (monthlyData[month] || 0) + 1;
    });
    return monthlyData;
  };

  const getStyleEvolution = () => {
    const recentHistory = history.slice(0, 10);
    const olderHistory = history.slice(-10);
    
    const getAvgConfidence = (items: RewriteHistoryItem[]) => 
      items.length > 0 ? items.reduce((sum, item) => sum + item.confidence, 0) / items.length : 0;

    return {
      recent_avg_confidence: getAvgConfidence(recentHistory),
      older_avg_confidence: getAvgConfidence(olderHistory),
      improvement: getAvgConfidence(recentHistory) - getAvgConfidence(olderHistory)
    };
  };

  const filteredHistory = history
    .filter(item => 
      item.original_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.rewritten_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.style_tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .filter(item => !filterTag || item.style_tags.includes(filterTag))
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        return b.confidence - a.confidence;
      }
    });

  const allTags = Array.from(new Set(history.flatMap(item => item.style_tags)));

  if (!isOpen) return null;

  // Check access permissions
  const hasAccess = user?.subscription_tier === 'pro' || user?.subscription_tier === 'premium';
  const hasFullAnalytics = user?.subscription_tier === 'premium';

  if (!hasAccess) {
    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 w-full max-w-md shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Rewrite History</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-white" />
            </div>
            
            <h3 className="text-lg font-bold text-gray-800 mb-2">Upgrade Required</h3>
            <p className="text-gray-600 mb-6">
              Rewrite history access requires a Pro or Premium subscription to track and analyze your writing transformations.
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-blue-600">
                <Crown className="w-4 h-4" />
                <span className="text-sm">Pro: Rewrite history access</span>
              </div>
              <div className="flex items-center gap-3 text-amber-600">
                <Star className="w-4 h-4" />
                <span className="text-sm">Premium: Full analytics & unlimited history</span>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenPricing?.();
              }}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-600 transition-all transform hover:scale-105 shadow-lg shadow-blue-500/25"
            >
              Upgrade to Access History
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-6xl max-h-[90vh] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Rewrite History</h2>
              <div className="flex items-center gap-2">
                {hasFullAnalytics ? (
                  <div className="flex items-center gap-1 text-amber-600">
                    <Star className="w-3 h-3" />
                    <span className="text-xs">Full Analytics</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-blue-600">
                    <Crown className="w-3 h-3" />
                    <span className="text-xs">Pro Access</span>
                  </div>
                )}
                <span className="text-gray-500 text-sm">• {history.length} rewrites</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-6 border-b border-gray-200 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search rewrites..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'confidence')}
                className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
              >
                <option value="date">Sort by Date</option>
                <option value="confidence">Sort by Confidence</option>
              </select>
              
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
              >
                <option value="">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
              
              <button
                onClick={handleExportHistory}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export All
                {user && user.subscription_tier === 'free' && (
                  <span className="text-xs opacity-75">
                    ({5 - (user.monthly_exports_used || 0)} left)
                  </span>
                )}
                {user && user.subscription_tier === 'pro' && (
                  <span className="text-xs opacity-75">
                    ({200 - (user.monthly_exports_used || 0)} left)
                  </span>
                )}
                {user && user.subscription_tier === 'premium' && (
                  <span className="text-xs opacity-75">
                    (Unlimited)
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Premium Analytics Summary */}
          {hasFullAnalytics && history.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
              <div className="text-center">
                <p className="text-amber-800 font-bold text-lg">
                  {Math.round(history.reduce((sum, item) => sum + item.confidence, 0) / history.length)}%
                </p>
                <p className="text-amber-600 text-xs">Avg Confidence</p>
              </div>
              <div className="text-center">
                <p className="text-amber-800 font-bold text-lg">{getMostCommonTags()[0]?.tag || 'N/A'}</p>
                <p className="text-amber-600 text-xs">Top Style</p>
              </div>
              <div className="text-center">
                <p className="text-amber-800 font-bold text-lg">{Object.keys(getMonthlyBreakdown()).length}</p>
                <p className="text-amber-600 text-xs">Active Months</p>
              </div>
              <div className="text-center">
                <p className="text-amber-800 font-bold text-lg">
                  {getStyleEvolution().improvement > 0 ? '+' : ''}{Math.round(getStyleEvolution().improvement)}%
                </p>
                <p className="text-amber-600 text-xs">Improvement</p>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* History List */}
          <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
            {loading && page === 0 ? (
              <div className="p-6 text-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading history...</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-6 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No rewrites found</p>
                <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedItem?.id === item.id
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          item.confidence >= 80 ? 'bg-emerald-500' :
                          item.confidence >= 60 ? 'bg-amber-500' : 'bg-red-500'
                        }`} />
                        <span className="text-sm font-medium text-gray-700">{Math.round(item.confidence)}%</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportSingleItem(item);
                          }}
                          disabled={exportingId === item.id}
                          className="ml-2 p-1 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                          title="Export this rewrite"
                        >
                          {exportingId === item.id ? (
                            <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-gray-800 text-sm line-clamp-2 mb-2">
                      {item.original_text.substring(0, 100)}...
                    </p>
                    
                    <div className="flex flex-wrap gap-1">
                      {item.style_tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {item.style_tags.length > 3 && (
                        <span className="text-xs text-gray-500">+{item.style_tags.length - 3} more</span>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Load more button */}
                {hasMore && (
                  <div className="text-center py-4">
                    <button
                      onClick={loadMoreHistory}
                      disabled={loading}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                          Loading more...
                        </div>
                      ) : (
                        'Load more'
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Detail View */}
          <div className="w-1/2 overflow-y-auto">
            {selectedItem ? (
              <div className="p-6">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Rewrite Details</h3>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        selectedItem.confidence >= 80 ? 'bg-emerald-500' :
                        selectedItem.confidence >= 60 ? 'bg-amber-500' : 'bg-red-500'
                      }`} />
                      <span className="font-medium text-gray-700">{Math.round(selectedItem.confidence)}% confidence</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                    <Calendar className="w-4 h-4" />
                    {new Date(selectedItem.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Original Text</h4>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedItem.original_text}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Rewritten Text</h4>
                    <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedItem.rewritten_text}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Style Analysis</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.style_tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {hasFullAnalytics && (
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        Premium Analytics
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-amber-700">Word Count Change</p>
                          <p className="font-medium text-amber-800">
                            {selectedItem.original_text.split(' ').length} → {selectedItem.rewritten_text.split(' ').length}
                          </p>
                        </div>
                        <div>
                          <p className="text-amber-700">Style Confidence</p>
                          <p className="font-medium text-amber-800">{Math.round(selectedItem.confidence)}%</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleExportSingleItem(selectedItem)}
                      disabled={exportingId === selectedItem.id}
                      className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {exportingId === selectedItem.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Export This Rewrite
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p>Select a rewrite to view details</p>
                <p className="text-sm text-gray-400">Click on any item from the history list</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}