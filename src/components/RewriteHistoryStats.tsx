import React, { useState, useEffect } from 'react';
import { BarChart3, Receipt, Calendar, Clock, Star, Crown, Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface RewriteStats {
  totalRewrites: number;
  thisMonth: number;
  lastRewrite: Date | null;
}

interface RewriteHistoryStatsProps {
  onOpenPricing?: () => void;
  refreshTrigger?: number; // Used to trigger refresh after new rewrites
}

export default function RewriteHistoryStats({ onOpenPricing, refreshTrigger }: RewriteHistoryStatsProps) {
  const [stats, setStats] = useState<RewriteStats>({
    totalRewrites: 0,
    thisMonth: 0,
    lastRewrite: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user, refreshTrigger]);

  const loadStats = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Use the database function for better performance
      const { data, error: statsError } = await supabase
        .rpc('get_rewrite_stats', { p_user_id: user.id });

      if (statsError) {
        console.error('Error loading rewrite stats:', statsError);
        setError('Failed to load rewrite statistics');
        return;
      }

      const statsData = data?.[0];
      if (statsData) {
        setStats({
          totalRewrites: parseInt(statsData.total_rewrites) || 0,
          thisMonth: parseInt(statsData.this_month) || 0,
          lastRewrite: statsData.last_rewrite ? new Date(statsData.last_rewrite) : null
        });
      }
    } catch (error) {
      console.error('Exception loading rewrite stats:', error);
      setError('Failed to load rewrite statistics');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const getHistoryLimitMessage = () => {
    switch (user.subscription_tier) {
      case 'premium':
        return {
          title: 'Premium Benefit Active',
          message: '✨ Unlimited rewrite history with full analytics • Advanced style tracking • Export with detailed insights',
          bgColor: 'from-amber-100 to-orange-100',
          borderColor: 'border-amber-200',
          textColor: 'text-amber-800',
          subTextColor: 'text-amber-700',
          icon: <Star className="w-4 h-4 text-amber-600" />
        };
      case 'pro':
        return {
          title: 'Pro Benefits Active',
          message: 'Rewrite history access • Advanced analytics • Up to 200 exports/month',
          bgColor: 'from-blue-100 to-indigo-100',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          subTextColor: 'text-blue-700',
          icon: <Crown className="w-4 h-4 text-blue-600" />,
          showUpgrade: true,
          upgradeText: 'Upgrade for Full Analytics'
        };
      default:
        return {
          title: 'Limited History Access',
          message: 'Free users: Basic rewrite tracking • Upgrade for full history with analytics',
          bgColor: 'from-gray-100 to-blue-100',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-700',
          subTextColor: 'text-gray-600',
          icon: <Shield className="w-4 h-4 text-gray-500" />,
          showUpgrade: true,
          upgradeText: 'Get Full Analytics'
        };
    }
  };

  const historyInfo = getHistoryLimitMessage();

  if (loading) {
    return (
      <div className="mb-6 p-4 sm:p-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-blue-700">Loading rewrite history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6 p-4 sm:p-6 bg-red-50 border border-red-200 rounded-xl">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <div>
            <p className="text-red-700 font-medium">Unable to load rewrite history</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 sm:p-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-blue-800 font-semibold text-base sm:text-lg">Rewrite History & Analytics</h3>
          <p className="text-blue-600 text-sm">Track your writing transformations and style evolution</p>
        </div>
      </div>
      
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <div className="bg-white/80 rounded-lg p-4 border border-blue-100">
          <div className="flex items-center gap-3">
            <Receipt className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="text-emerald-700 font-bold text-lg">{stats.totalRewrites}</p>
              <p className="text-emerald-600 text-sm">Total Rewrites</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white/80 rounded-lg p-4 border border-blue-100">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-blue-700 font-bold text-lg">{stats.thisMonth}</p>
              <p className="text-blue-600 text-sm">This Month</p>
            </div>
          </div>
        </div>
        
        {stats.lastRewrite && (
          <div className="bg-white/80 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-purple-700 font-bold text-sm">{stats.lastRewrite.toLocaleDateString()}</p>
                <p className="text-purple-600 text-sm">Last Rewrite</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Subscription Benefits Display */}
      <div className={`bg-gradient-to-r ${historyInfo.bgColor} border ${historyInfo.borderColor} rounded-lg p-4`}>
        <div className="flex items-center gap-3">
          {historyInfo.icon}
          <div className="flex-1">
            <p className={`${historyInfo.textColor} font-semibold text-sm`}>{historyInfo.title}</p>
            <p className={`${historyInfo.subTextColor} text-xs`}>
              {historyInfo.message}
            </p>
          </div>
          {historyInfo.showUpgrade && onOpenPricing && (
            <button
              onClick={onOpenPricing}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                user.subscription_tier === 'free'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600'
                  : 'bg-amber-500 text-white hover:bg-amber-600'
              }`}
            >
              {historyInfo.upgradeText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}