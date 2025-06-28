import React, { useState, useEffect } from 'react';
import { PenTool, Sparkles, LogIn, Zap } from 'lucide-react';
import StyleCapture from './components/StyleCapture';
import TextRewriter from './components/TextRewriter';
import AuthModal from './components/AuthModal';
import SettingsModal from './components/SettingsModal';
import PricingModal from './components/PricingModal';
import SubscriptionManagement from './components/SubscriptionManagement';
import UserMenu from './components/UserMenu';
import { WritingSample } from './types';
import { useAuth } from './hooks/useAuth';

type AppView = 'capture' | 'rewrite' | 'subscription';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('capture');
  const [writingSamples, setWritingSamples] = useState<WritingSample[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);

  const { user, loading } = useAuth();

  // Reset view and clear data when user signs out
  useEffect(() => {
    if (!user && !loading) {
      // User has signed out, reset to capture view and clear samples
      setCurrentView('capture');
      setWritingSamples([]);
      setShowSettingsModal(false);
      setShowPricingModal(false);
    }
  }, [user, loading]);

  const handleSamplesChange = (samples: WritingSample[]) => {
    setWritingSamples(samples);
  };

  const handleNext = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setCurrentView('rewrite');
  };

  const handleBack = () => {
    setCurrentView('capture');
  };

  const handleManageSubscription = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setCurrentView('subscription');
    setShowSettingsModal(false);
  };

  const handleOpenPricing = () => {
    setShowPricingModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show signed out state for rewrite and subscription views when not authenticated
  if (!user && (currentView === 'rewrite' || currentView === 'subscription')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                  <PenTool className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-center sm:text-left">
                  <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    TweakMyText
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600">AI-Powered Writing Style Rewriter</p>
                </div>
              </div>
              
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-600 transition-all text-sm shadow-md hover:shadow-lg"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            </div>
          </div>
        </header>

        {/* Signed Out Content */}
        <main className="py-8 lg:py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 p-8 sm:p-12 shadow-lg">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <LogIn className="w-10 h-10 text-white" />
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 via-gray-700 to-gray-600 bg-clip-text text-transparent mb-4">
                Sign In Required
              </h1>
              
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                You've been signed out. Please sign in to access your writing samples, 
                rewrite text, and manage your subscription.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-indigo-600 transition-all transform hover:scale-105 shadow-2xl shadow-blue-500/25"
                >
                  <LogIn className="w-5 h-5" />
                  Sign In to Continue
                </button>
                
                <button
                  onClick={() => {
                    setCurrentView('capture');
                    setWritingSamples([]);
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-3 bg-white text-gray-700 rounded-xl font-medium border border-gray-200 hover:bg-gray-50 transition-all"
                >
                  <PenTool className="w-5 h-5" />
                  Back to Home
                </button>
              </div>

              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-blue-700 text-sm">
                  💡 New users get 3 free daily rewrites! Sign up to get started.
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white/60 backdrop-blur-xl border-t border-gray-200/50 mt-8 sm:mt-12 lg:mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="flex items-center gap-3 text-gray-600">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                <span className="text-xs sm:text-sm text-center">Transform any text to match your unique writing style</span>
              </div>
              
              {/* Built with Bolt.new Badge */}
              <a
                href="https://bolt.new"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-medium rounded-full hover:from-orange-600 hover:to-red-600 transition-all transform hover:scale-105 shadow-lg shadow-orange-500/25"
              >
                <Zap className="w-3 h-3" />
                Built with Bolt.new
              </a>
            </div>
          </div>
        </footer>

        {/* Auth Modal */}
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                <PenTool className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  TweakMyText
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">AI-Powered Writing Style Rewriter</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Progress Indicators */}
              {currentView !== 'subscription' && (
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                      currentView === 'capture' 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg shadow-blue-400/50' 
                        : 'bg-gray-300'
                    }`} />
                    <span className="text-xs sm:text-sm text-gray-700 font-medium">Capture</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                      currentView === 'rewrite' 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg shadow-blue-400/50' 
                        : 'bg-gray-300'
                    }`} />
                    <span className="text-xs sm:text-sm text-gray-700 font-medium">Rewrite</span>
                  </div>
                </div>
              )}

              {/* Auth/User Section */}
              {user ? (
                <UserMenu 
                  onOpenSettings={() => setShowSettingsModal(true)}
                  onManageSubscription={handleManageSubscription}
                  onOpenPricing={handleOpenPricing}
                />
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-600 transition-all text-sm shadow-md hover:shadow-lg"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-4 sm:py-6 lg:py-8">
        {currentView === 'capture' ? (
          <StyleCapture
            samples={writingSamples}
            onSamplesChange={handleSamplesChange}
            onNext={handleNext}
          />
        ) : currentView === 'rewrite' ? (
          <TextRewriter
            samples={writingSamples}
            onBack={handleBack}
            onOpenPricing={handleOpenPricing}
          />
        ) : (
          <SubscriptionManagement
            onBack={() => setCurrentView('capture')}
            onOpenPricing={handleOpenPricing}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white/60 backdrop-blur-xl border-t border-gray-200/50 mt-8 sm:mt-12 lg:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-3 text-gray-600">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
              <span className="text-xs sm:text-sm text-center">Transform any text to match your unique writing style</span>
            </div>
            
            {/* Built with Bolt.new Badge */}
            <a
              href="https://bolt.new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-medium rounded-full hover:from-orange-600 hover:to-red-600 transition-all transform hover:scale-105 shadow-lg shadow-orange-500/25"
            >
              <Zap className="w-3 h-3" />
              Built with Bolt.new
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onManageSubscription={handleManageSubscription}
      />

      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
      />
    </div>
  );
}

export default App;