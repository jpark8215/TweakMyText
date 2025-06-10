import React from 'react';
import { X, Check, Zap, Crown, Star } from 'lucide-react';
import { PricingTier } from '../types';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (tier: string) => void;
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

export default function PricingModal({ isOpen, onClose, onSelectPlan }: PricingModalProps) {
  if (!isOpen) return null;

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
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Choose Your Plan</h2>
            <p className="text-gray-300">Unlock the full power of AI-driven style rewriting</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {pricingTiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative bg-white/10 backdrop-blur-xl rounded-2xl border p-6 transition-all hover:scale-105 hover:bg-white/15 ${
                tier.popular 
                  ? 'border-cyan-400/50 shadow-2xl shadow-cyan-500/25' 
                  : 'border-white/20'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <div className={`w-16 h-16 bg-gradient-to-br ${getGradient(tier.id)} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                  {getIcon(tier.id)}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-white">${tier.price}</span>
                  {tier.price > 0 && <span className="text-gray-400">/month</span>}
                </div>
                <p className="text-cyan-300 font-medium">
                  {getCreditsText(tier)} rewrites
                </p>
              </div>

              <ul className="space-y-3 mb-6">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 text-gray-300">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => onSelectPlan(tier.id)}
                className={`w-full py-3 rounded-xl font-medium transition-all transform hover:scale-105 ${
                  tier.popular
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/25'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                }`}
              >
                {tier.price === 0 ? 'Get Started' : 'Upgrade Now'}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            All plans include secure processing and data privacy protection
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Free tier: Credits reset daily at midnight UTC. Monthly limit resets on your signup anniversary.
          </p>
        </div>
      </div>
    </div>
  );
}