import React, { useState, useEffect } from 'react';
import { ArrowLeft, Crown, Calendar, CreditCard, AlertTriangle, Check, Zap, Star, Download, Receipt } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface SubscriptionManagementProps {
  onBack: () => void;
  onOpenPricing?: () => void;
}

interface BillingRecord {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  description: string;
  created_at: string;
  subscription_tier: string;
}

export default function SubscriptionManagement({ onBack, onOpenPricing }: SubscriptionManagementProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([]);
  const [loadingBilling, setLoadingBilling] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadBillingHistory();
    }
  }, [user]);

  const loadBillingHistory = async () => {
    if (!user) return;

    setLoadingBilling(true);
    try {
      // In a real implementation, you would have a billing_history table
      // For now, we'll create some sample data based on the user's subscription
      const mockBillingData: BillingRecord[] = [];
      
      if (user.subscription_tier !== 'free') {
        const tierPrice = user.subscription_tier === 'pro' ? 4.99 : 7.99;
        const currentDate = new Date();
        
        // Generate last 3 months of billing history
        for (let i = 0; i < 3; i++) {
          const billingDate = new Date(currentDate);
          billingDate.setMonth(billingDate.getMonth() - i);
          
          mockBillingData.push({
            id: `bill_${i + 1}`,
            amount: tierPrice,
            currency: 'USD',
            status: 'paid',
            description: `${user.subscription_tier.charAt(0).toUpperCase() + user.subscription_tier.slice(1)} Plan`,
            created_at: billingDate.toISOString(),
            subscription_tier: user.subscription_tier
          });
        }
      }

      setBillingHistory(mockBillingData);
    } catch (error) {
      console.error('Error loading billing history:', error);
    } finally {
      setLoadingBilling(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-600">Please sign in to manage your subscription.</p>
          <button
            onClick={onBack}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>
      </div>
    );
  }

  const handleCancelSubscription = async () => {
    setIsProcessing(true);
    try {
      // In a real app, this would call your backend to cancel the subscription
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      alert('Subscription cancelled successfully. You will retain access until the end of your billing period.');
      setShowCancelConfirm(false);
    } catch (error) {
      alert('Failed to cancel subscription. Please try again or contact support.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpgrade = () => {
    onOpenPricing?.();
  };

  const getTierInfo = (tier: string) => {
    switch (tier) {
      case 'pro':
        return {
          name: 'Pro',
          price: '$4.99/month',
          credits: '200 credits/month',
          color: 'from-blue-500 to-indigo-500',
          features: [
            '200 rewrites per month',
            'Advanced style analysis',
            'Save up to 25 writing samples',
            'Export results (up to 200 rewrites)',
            'Rewrite history access',
            'Access to basic tone presets',
            'Priority processing (2x faster)'
          ]
        };
      case 'premium':
        return {
          name: 'Premium',
          price: '$7.99/month',
          credits: '300 credits/month',
          color: 'from-amber-500 to-orange-500',
          features: [
            '300 rewrites per month',
            'Extended style analysis with confidence scoring',
            'Save up to 100 writing samples',
            'Unlimited exports & rewrite history (up to 300 rewrites)',
            'Full rewrite history with analytics',
            'Bulk rewrite operations',
            'Custom tone fine-tuning with advanced presets',
            'Fastest processing (3x speed)'
          ]
        };
      default:
        return {
          name: 'Free',
          price: 'Free',
          credits: '90 credits/month max',
          color: 'from-gray-400 to-gray-500',
          features: [
            '3 rewrites per day (90 per month)',
            'Basic style analysis',
            'Save up to 3 writing samples',
            '5 rewrites per month for export',
            'Export results (limited to 5 rewrites per month)'
          ]
        };
    }
  };

  const tierInfo = getTierInfo(user.subscription_tier);

  // Calculate usage percentages
  const creditUsagePercent = user.subscription_tier === 'free' 
    ? Math.round((user.monthly_credits_used / 90) * 100)
    : user.subscription_tier === 'pro'
    ? Math.round((user.monthly_credits_used / 200) * 100)
    : Math.round((user.monthly_credits_used / 300) * 100);

  const exportUsagePercent = user.subscription_tier === 'free'
    ? Math.round(((user.monthly_exports_used || 0) / 5) * 100)
    : user.subscription_tier === 'pro'
    ? Math.round(((user.monthly_exports_used || 0) / 200) * 100)
    : 0; // Premium has unlimited exports

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-emerald-600';
      case 'pending':
        return 'text-amber-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Subscription Management</h1>
      </div>

      {/* Current Plan */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 p-6 sm:p-8 mb-8 shadow-lg">
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-12 h-12 bg-gradient-to-br ${tierInfo.color} rounded-xl flex items-center justify-center`}>
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{tierInfo.name} Plan</h2>
            <p className="text-gray-600">{tierInfo.price}</p>
          </div>
        </div>

        {/* Usage Statistics */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-5 h-5 text-amber-600" />
              <span className="text-gray-800 font-medium">Credits</span>
            </div>
            <p className="text-gray-600 text-sm mb-2">{tierInfo.credits}</p>
            <div className="flex items-center justify-between">
              <p className="text-blue-600 text-lg font-bold">{user.credits_remaining} remaining</p>
              <span className="text-xs text-gray-500">{creditUsagePercent}% used</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${creditUsagePercent}%` }}
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Download className="w-5 h-5 text-emerald-600" />
              <span className="text-gray-800 font-medium">Exports</span>
            </div>
            <p className="text-gray-600 text-sm mb-2">
              {user.subscription_tier === 'premium' ? 'Unlimited' : 
               user.subscription_tier === 'pro' ? '200/month' : '5/month'}
            </p>
            <div className="flex items-center justify-between">
              <p className="text-emerald-600 text-lg font-bold">
                {user.subscription_tier === 'premium' ? 'Unlimited' : 
                 `${(user.monthly_exports_used || 0)} used`}
              </p>
              {user.subscription_tier !== 'premium' && (
                <span className="text-xs text-gray-500">{exportUsagePercent}% used</span>
              )}
            </div>
            {user.subscription_tier !== 'premium' && (
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${exportUsagePercent}%` }}
                />
              </div>
            )}
          </div>

          {user.subscription_expires_at && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <span className="text-gray-800 font-medium">Next Billing</span>
              </div>
              <p className="text-gray-600 text-sm">
                {user.subscription_expires_at.toLocaleDateString()}
              </p>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Check className="w-5 h-5 text-emerald-600" />
              <span className="text-gray-800 font-medium">Status</span>
            </div>
            <p className="text-emerald-600 font-medium">Active</p>
            <p className="text-xs text-gray-500 mt-1">
              Resets on day {user.monthly_reset_date}
            </p>
          </div>
        </div>

        {/* Plan Features */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Plan Features</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {tierInfo.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="text-gray-700 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          {user.subscription_tier === 'free' ? (
            <button
              onClick={handleUpgrade}
              className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-600 transition-all transform hover:scale-105 shadow-lg shadow-blue-500/25"
            >
              Upgrade Plan
            </button>
          ) : (
            <>
              <button
                onClick={handleUpgrade}
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-600 transition-all transform hover:scale-105 shadow-lg shadow-blue-500/25"
              >
                {user.subscription_tier === 'pro' ? 'Upgrade to Premium' : 'Change Plan'}
              </button>
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-all border border-red-200"
              >
                Cancel Subscription
              </button>
            </>
          )}
        </div>
      </div>

      {/* Billing History */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <Receipt className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-bold text-gray-800">Billing History</h3>
        </div>
        
        {loadingBilling ? (
          <div className="text-center py-8">
            <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 mt-2">Loading billing history...</p>
          </div>
        ) : billingHistory.length > 0 ? (
          <div className="space-y-4">
            {billingHistory.map((record) => (
              <div key={record.id} className="flex items-center justify-between py-4 border-b border-gray-200 last:border-b-0">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-gray-800 font-medium">{record.description}</p>
                    <p className="text-gray-500 text-sm">{formatDate(record.created_at)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-gray-800 font-medium">
                    ${record.amount.toFixed(2)} {record.currency.toUpperCase()}
                  </p>
                  <p className={`text-sm capitalize ${getStatusColor(record.status)}`}>
                    {record.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No billing history available</p>
            <p className="text-gray-400 text-sm mt-1">
              {user.subscription_tier === 'free' 
                ? 'Upgrade to a paid plan to see billing history'
                : 'Billing records will appear here after your first payment'
              }
            </p>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Cancel Subscription</h3>
            </div>

            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel your subscription? You'll lose access to premium features at the end of your billing period.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={isProcessing}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isProcessing ? 'Cancelling...' : 'Cancel Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}