import React, { useState, useEffect } from 'react';
import { ArrowLeft, Crown, Calendar, CreditCard, AlertTriangle, Check, Zap, Star, Download, Receipt, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface BillingRecord {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  description: string;
  created_at: string;
  subscription_tier: string;
}

interface SubscriptionManagementProps {
  onBack: () => void;
  onOpenPricing?: () => void;
}

interface SubscriptionStatus {
  isActive: boolean;
  willCancel: boolean;
  isCancelled: boolean;
  cancelDate?: Date;
  nextBillingDate?: Date;
  gracePeriodEnd?: Date;
  daysUntilCancellation?: number;
  cancellationReason?: string;
}

export default function SubscriptionManagement({ onBack, onOpenPricing }: SubscriptionManagementProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([]);
  const [loadingBilling, setLoadingBilling] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isActive: true,
    willCancel: false,
    isCancelled: false
  });

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadBillingHistory();
      checkSubscriptionStatus();
    }
  }, [user]);

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K`;
    }
    return tokens.toString();
  };

  const checkSubscriptionStatus = async () => {
    if (!user) return;

    try {
      // Check if subscription is marked for cancellation
      const { data, error } = await supabase
        .from('users')
        .select('subscription_tier, subscription_expires_at, created_at')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking subscription status:', error);
        return;
      }

      const now = new Date();
      const expiresAt = data.subscription_expires_at ? new Date(data.subscription_expires_at) : null;
      
      // Calculate subscription status
      const isActive = user.subscription_tier !== 'free';
      
      // Check if subscription has expired
      const isCancelled = isActive && expiresAt && now > expiresAt;
      
      // For demo purposes, simulate different cancellation states
      // In production, this would come from your payment provider (Stripe, etc.)
      const willCancel = localStorage.getItem(`subscription_cancelled_${user.id}`) === 'true';
      
      let daysUntilCancellation = 0;
      if (willCancel && expiresAt) {
        daysUntilCancellation = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      } else if (isCancelled && expiresAt) {
        daysUntilCancellation = Math.ceil((now.getTime() - expiresAt.getTime()) / (1000 * 60 * 60 * 24));
      }
      
      setSubscriptionStatus({
        isActive: isActive && !isCancelled,
        willCancel: willCancel && !isCancelled,
        isCancelled,
        cancelDate: willCancel || isCancelled ? expiresAt : undefined,
        nextBillingDate: isActive && !willCancel && !isCancelled ? expiresAt : undefined,
        gracePeriodEnd: willCancel ? expiresAt : undefined,
        daysUntilCancellation: Math.max(0, daysUntilCancellation),
        cancellationReason: willCancel ? localStorage.getItem(`cancellation_reason_${user.id}`) || 'User requested' : undefined
      });
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };

  const loadBillingHistory = async () => {
    if (!user) return;

    setLoadingBilling(true);
    try {
      // Load real billing history from database
      const { data: realBillingData, error } = await supabase
        .from('billing_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading billing history:', error);
        setBillingHistory([]);
      } else {
        setBillingHistory(realBillingData || []);
      }
    } catch (error) {
      console.error('Error loading billing history:', error);
      setBillingHistory([]);
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
      
      // Store cancellation in localStorage for demo
      localStorage.setItem(`subscription_cancelled_${user.id}`, 'true');
      localStorage.setItem(`cancellation_reason_${user.id}`, 'User requested cancellation');
      
      // Update subscription status to show cancellation
      const cancelDate = user.subscription_expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const now = new Date();
      const daysUntilCancellation = Math.ceil((cancelDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      setSubscriptionStatus({
        ...subscriptionStatus,
        willCancel: true,
        cancelDate,
        daysUntilCancellation: Math.max(0, daysUntilCancellation),
        cancellationReason: 'User requested cancellation'
      });
      
      setShowCancelConfirm(false);
      
      // Show comprehensive success message
      alert(`✅ Subscription cancelled successfully!

📅 Your ${user.subscription_tier} subscription will remain active until ${cancelDate.toLocaleDateString()}

✨ What this means:
• You'll keep all premium features until ${cancelDate.toLocaleDateString()}
• All your saved rewrites and writing samples are preserved
• No further charges will be made to your payment method
• You can reactivate anytime before the end date

💡 Need help? Contact support if you have any questions.`);
    } catch (error) {
      alert('Failed to cancel subscription. Please try again or contact support.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setIsProcessing(true);
    try {
      // In a real app, this would call your backend to reactivate
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Remove cancellation from localStorage for demo
      localStorage.removeItem(`subscription_cancelled_${user.id}`);
      localStorage.removeItem(`cancellation_reason_${user.id}`);
      
      setSubscriptionStatus({
        ...subscriptionStatus,
        willCancel: false,
        isCancelled: false,
        cancelDate: undefined,
        cancellationReason: undefined,
        nextBillingDate: user.subscription_expires_at
      });
      
      alert('✅ Subscription reactivated successfully! Your premium features will continue uninterrupted.');
    } catch (error) {
      alert('Failed to reactivate subscription. Please try again or contact support.');
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
          price: '$10/month',
          tokens: '5M tokens/month',
          color: 'from-blue-500 to-indigo-500',
          features: [
            '5,000,000 tokens per month',
            'No daily token limits',
            'Advanced style analysis',
            'Save up to 25 writing samples',
            'Export results (up to 200 per month)',
            'Rewrite history access',
            'Access to basic tone presets',
            'Priority processing (2x faster)'
          ]
        };
      case 'premium':
        return {
          name: 'Premium',
          price: '$18/month',
          tokens: '10M tokens/month',
          color: 'from-amber-500 to-orange-500',
          features: [
            '10,000,000 tokens per month',
            'No daily token limits',
            'Extended style analysis with confidence scoring',
            'Save up to 100 writing samples',
            'Unlimited exports & rewrite history',
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
          tokens: '1M tokens/month',
          color: 'from-gray-400 to-gray-500',
          features: [
            '1,000,000 tokens per month',
            '100,000 tokens per day limit',
            'Basic style analysis',
            'Save up to 3 writing samples',
            '5 exports per month',
            'Export results (limited to 5 per month)'
          ]
        };
    }
  };

  const tierInfo = getTierInfo(user.subscription_tier);

  // Calculate usage percentages
  const tokenUsagePercent = user.subscription_tier === 'free' 
    ? Math.round((user.monthly_tokens_used / 1000000) * 100)
    : user.subscription_tier === 'pro'
    ? Math.round((user.monthly_tokens_used / 5000000) * 100)
    : Math.round((user.monthly_tokens_used / 10000000) * 100);

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
      case 'refunded':
        return 'text-purple-600';
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

      {/* Subscription Status Alerts */}
      {subscriptionStatus.isCancelled && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="text-red-800 font-medium">Subscription Expired</h3>
              <p className="text-red-700 text-sm">
                Your {tierInfo.name} subscription expired on {subscriptionStatus.cancelDate?.toLocaleDateString()}.
                You're now on the Free plan. Upgrade to restore premium features.
              </p>
            </div>
          </div>
        </div>
      )}

      {subscriptionStatus.willCancel && !subscriptionStatus.isCancelled && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-amber-800 font-medium">Subscription Scheduled for Cancellation</h3>
              <p className="text-amber-700 text-sm mb-2">
                Your {tierInfo.name} subscription will end on{' '}
                <strong>{subscriptionStatus.cancelDate?.toLocaleDateString()}</strong>
                {subscriptionStatus.daysUntilCancellation !== undefined && (
                  <span> ({subscriptionStatus.daysUntilCancellation} days remaining)</span>
                )}
              </p>
              <div className="flex items-center gap-2 text-xs text-amber-600">
                <Clock className="w-3 h-3" />
                <span>Reason: {subscriptionStatus.cancellationReason}</span>
              </div>
            </div>
            <button
              onClick={handleReactivateSubscription}
              disabled={isProcessing}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
            >
              {isProcessing ? 'Reactivating...' : 'Reactivate'}
            </button>
          </div>
        </div>
      )}

      {subscriptionStatus.isActive && !subscriptionStatus.willCancel && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <h3 className="text-emerald-800 font-medium">Subscription Active</h3>
              <p className="text-emerald-700 text-sm">
                Your {tierInfo.name} subscription is active and will renew on{' '}
                {subscriptionStatus.nextBillingDate?.toLocaleDateString() || 'your next billing date'}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current Plan */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 p-6 sm:p-8 mb-8 shadow-lg">
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-12 h-12 bg-gradient-to-br ${tierInfo.color} rounded-xl flex items-center justify-center`}>
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-800">{tierInfo.name} Plan</h2>
              {subscriptionStatus.isActive && !subscriptionStatus.willCancel && (
                <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                  <CheckCircle className="w-3 h-3" />
                  Active
                </div>
              )}
              {subscriptionStatus.willCancel && !subscriptionStatus.isCancelled && (
                <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                  <Clock className="w-3 h-3" />
                  Ending {subscriptionStatus.daysUntilCancellation}d
                </div>
              )}
              {subscriptionStatus.isCancelled && (
                <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                  <XCircle className="w-3 h-3" />
                  Expired
                </div>
              )}
            </div>
            <p className="text-gray-600">{tierInfo.price}</p>
          </div>
        </div>

        {/* Usage Statistics */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-5 h-5 text-amber-600" />
              <span className="text-gray-800 font-medium">Tokens</span>
            </div>
            <p className="text-gray-600 text-sm mb-2">{tierInfo.tokens}</p>
            <div className="flex items-center justify-between">
              <p className="text-blue-600 text-lg font-bold">{formatTokens(user.tokens_remaining)} remaining</p>
              <span className="text-xs text-gray-500">{tokenUsagePercent}% used</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${tokenUsagePercent}%` }}
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
                <span className="text-gray-800 font-medium">
                  {subscriptionStatus.willCancel ? 'Access Ends' : 'Next Billing'}
                </span>
              </div>
              <p className="text-gray-600 text-sm">
                {user.subscription_expires_at.toLocaleDateString()}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className={`text-sm font-medium ${
                  subscriptionStatus.willCancel ? 'text-amber-600' : 
                  subscriptionStatus.isCancelled ? 'text-red-600' : 'text-emerald-600'
                }`}>
                  {subscriptionStatus.isCancelled ? 'Expired' :
                   subscriptionStatus.willCancel ? 'Cancelled' : 'Active'}
                </span>
                {subscriptionStatus.daysUntilCancellation !== undefined && subscriptionStatus.daysUntilCancellation > 0 && (
                  <span className="text-xs text-amber-600">
                    {subscriptionStatus.daysUntilCancellation} days left
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Check className="w-5 h-5 text-emerald-600" />
              <span className="text-gray-800 font-medium">Status</span>
            </div>
            <p className={`font-medium ${
              subscriptionStatus.isCancelled ? 'text-red-600' :
              subscriptionStatus.willCancel ? 'text-amber-600' : 'text-emerald-600'
            }`}>
              {subscriptionStatus.isCancelled ? 'Expired' :
               subscriptionStatus.willCancel ? 'Ending Soon' : 'Active'}
            </p>
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
          {user.subscription_tier === 'free' || subscriptionStatus.isCancelled ? (
            <button
              onClick={handleUpgrade}
              className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-600 transition-all transform hover:scale-105 shadow-lg shadow-blue-500/25"
            >
              {subscriptionStatus.isCancelled ? 'Resubscribe' : 'Upgrade Plan'}
            </button>
          ) : (
            <>
              <button
                onClick={handleUpgrade}
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-600 transition-all transform hover:scale-105 shadow-lg shadow-blue-500/25"
              >
                {user.subscription_tier === 'pro' ? 'Upgrade to Premium' : 'Change Plan'}
              </button>
              {!subscriptionStatus.willCancel && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-all border border-red-200"
                >
                  Cancel Subscription
                </button>
              )}
              {subscriptionStatus.willCancel && (
                <button
                  onClick={handleReactivateSubscription}
                  disabled={isProcessing}
                  className="flex-1 py-3 bg-emerald-50 text-emerald-600 rounded-xl font-medium hover:bg-emerald-100 transition-all border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Reactivating...' : 'Reactivate Subscription'}
                </button>
              )}
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

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Are you sure you want to cancel your {tierInfo.name} subscription? You'll lose access to premium features at the end of your billing period.
              </p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <h4 className="text-amber-800 font-medium text-sm mb-2">What happens when you cancel:</h4>
                <ul className="text-amber-700 text-sm space-y-1">
                  <li>• Your subscription will remain active until {user.subscription_expires_at?.toLocaleDateString()}</li>
                  <li>• All your saved rewrites and writing samples will be preserved</li>
                  <li>• You can reactivate anytime before the end date</li>
                  <li>• After cancellation, you'll be moved to the free plan</li>
                  <li>• No further charges will be made to your payment method</li>
                </ul>
              </div>
            </div>

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