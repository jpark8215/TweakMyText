import React, { useState } from 'react';
import { X, CreditCard, Calendar, AlertTriangle, Check, Crown, Star, Zap, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { PricingTier } from '../types';

interface SubscriptionManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

const pricingTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    credits: 2,
    features: [
      '2 rewrites per day',
      'Maximum 30 rewrites per month',
      'Basic style matching',
      'Standard processing speed',
      'Email support'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    credits: 100,
    features: [
      '100 rewrites per month',
      'No daily limits',
      'Advanced style analysis',
      'Priority processing',
      'Tone fine-tuning',
      'Export options',
      'Priority support'
    ],
    popular: true
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 19.99,
    credits: 500,
    features: [
      '500 rewrites per month',
      'No daily limits',
      'Premium AI models',
      'Instant processing',
      'Advanced tone controls',
      'Bulk processing',
      'API access',
      'Custom style profiles',
      '24/7 priority support'
    ]
  }
];

export default function SubscriptionManagement({ isOpen, onClose }: SubscriptionManagementProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

  if (!isOpen || !user) return null;

  const currentTier = pricingTiers.find(tier => tier.id === user.subscription_tier);
  const otherTiers = pricingTiers.filter(tier => tier.id !== user.subscription_tier);

  const handleUpgrade = async (tierId: string) => {
    setIsProcessing(true);
    // In production, integrate with Stripe or payment processor
    console.log('Upgrading to:', tierId);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    alert(`Upgrade to ${tierId} plan initiated. You will be redirected to payment.`);
    setIsProcessing(false);
  };

  const handleCancelSubscription = async () => {
    setIsProcessing(true);
    // In production, call your cancellation API
    console.log('Cancelling subscription');
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    alert('Subscription cancelled. You will retain access until the end of your billing period.');
    setShowCancelConfirm(false);
    setIsProcessing(false);
  };

  const getIcon = (tierId: string) => {
    switch (tierId) {
      case 'free': return <Zap className="w-6 h-6" />;
      case 'pro': return <Star className="w-6 h-6" />;
      case 'premium': return <Crown className="w-6 h-6" />;
      default: return <Zap className="w-6 h-6" />;
    }
  };

  const getGradient = (tierId: string) => {
    switch (tierId) {
      case 'free': return 'from-gray-500 to-gray-600';
      case 'pro': return 'from-cyan-500 to-purple-500';
      case 'premium': return 'from-yellow-400 via-orange-500 to-pink-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getCreditsText = (tier: PricingTier) => {
    if (tier.id === 'free') {
      return '2 per day (30/month max)';
    }
    return `${tier.credits} per month`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl border border-white/20 p-6 sm:p-8 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Manage Subscription</h2>
              <p className="text-gray-300">View and manage your current plan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Current Plan */}
        {currentTier && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">Current Plan</h3>
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 bg-gradient-to-br ${getGradient(currentTier.id)} rounded-2xl flex items-center justify-center shadow-lg`}>
                    {getIcon(currentTier.id)}
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-white">{currentTier.name}</h4>
                    <p className="text-gray-300">
                      {currentTier.price === 0 ? 'Free Plan' : `$${currentTier.price}/month`}
                    </p>
                    <p className="text-cyan-300 text-sm">
                      {getCreditsText(currentTier)} rewrites
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-white font-medium">{user.credits_remaining} credits remaining</span>
                  </div>
                  {user.subscription_tier === 'free' && (
                    <p className="text-xs text-gray-400">
                      Daily: {user.daily_credits_used}/2 | Monthly: {user.monthly_credits_used}/30
                    </p>
                  )}
                  {user.subscription_expires_at && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>Expires: {formatDate(user.subscription_expires_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Current Plan Features */}
              <div className="mt-6 pt-6 border-t border-white/20">
                <h5 className="text-white font-medium mb-3">Your plan includes:</h5>
                <div className="grid sm:grid-cols-2 gap-2">
                  {currentTier.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-gray-300">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cancel Button for Paid Plans */}
              {user.subscription_tier !== 'free' && (
                <div className="mt-6 pt-6 border-t border-white/20">
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Cancel Subscription
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upgrade Options */}
        {otherTiers.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">
              {user.subscription_tier === 'free' ? 'Upgrade Your Plan' : 'Change Plan'}
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              {otherTiers.map((tier) => (
                <div
                  key={tier.id}
                  className={`bg-white/10 backdrop-blur-xl rounded-2xl border p-6 transition-all hover:scale-105 hover:bg-white/15 ${
                    tier.popular 
                      ? 'border-cyan-400/50 shadow-2xl shadow-cyan-500/25' 
                      : 'border-white/20'
                  }`}
                >
                  {tier.popular && (
                    <div className="text-center mb-4">
                      <span className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <div className={`w-16 h-16 bg-gradient-to-br ${getGradient(tier.id)} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                      {getIcon(tier.id)}
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">{tier.name}</h4>
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-white">${tier.price}</span>
                      <span className="text-gray-400">/month</span>
                    </div>
                    <p className="text-cyan-300 font-medium">
                      {getCreditsText(tier)} rewrites
                    </p>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-3 text-gray-300">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleUpgrade(tier.id)}
                    disabled={isProcessing}
                    className={`w-full py-3 rounded-xl font-medium transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                      tier.popular
                        ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/25'
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                    }`}
                  >
                    {isProcessing ? 'Processing...' : `Upgrade to ${tier.name}`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cancel Confirmation Modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-60 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-slate-900 via-red-900/20 to-slate-900 rounded-2xl border border-red-500/20 p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Cancel Subscription</h3>
              </div>
              
              <p className="text-gray-300 mb-6">
                Are you sure you want to cancel your subscription? You'll retain access to your current plan until the end of your billing period, then be downgraded to the free plan.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-all"
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
    </div>
  );
}