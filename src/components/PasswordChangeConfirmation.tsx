import React, { useState, useEffect } from 'react';
import { Check, AlertCircle, ArrowLeft, RefreshCw, LogIn, Shield } from 'lucide-react';

interface PasswordChangeConfirmationProps {
  isVisible: boolean;
  status: 'success' | 'error' | 'loading' | null;
  errorMessage?: string;
  onBackToLogin: () => void;
  onRetry?: () => void;
}

export default function PasswordChangeConfirmation({
  isVisible,
  status,
  errorMessage,
  onBackToLogin,
  onRetry
}: PasswordChangeConfirmationProps) {
  const [countdown, setCountdown] = useState(3);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Handle success countdown and redirect
  useEffect(() => {
    if (status === 'success' && isVisible) {
      setIsRedirecting(true);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onBackToLogin();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else {
      setCountdown(3);
      setIsRedirecting(false);
    }
  }, [status, isVisible, onBackToLogin]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 w-full max-w-md shadow-2xl">
        {/* Success State */}
        {status === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Check className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Password Changed Successfully!
            </h2>
            
            <p className="text-gray-600 mb-6 leading-relaxed">
              Your password has been updated successfully. You can now use your new password to sign in.
            </p>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-emerald-700">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Redirecting to login in {countdown} second{countdown !== 1 ? 's' : ''}...
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onBackToLogin}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-green-600 transition-all transform hover:scale-105 shadow-lg shadow-emerald-500/25"
              >
                <LogIn className="w-4 h-4 inline mr-2" />
                Go to Login Now
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {status === 'loading' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <RefreshCw className="w-8 h-8 text-white animate-spin" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Updating Your Password
            </h2>
            
            <p className="text-gray-600 mb-6 leading-relaxed">
              Please wait while we securely update your password. This may take a few moments.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-center gap-2 text-blue-700">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Processing your request...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Password Change Failed
            </h2>
            
            <p className="text-gray-600 mb-4 leading-relaxed">
              We encountered an issue while updating your password. Please try again or contact support if the problem persists.
            </p>

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-left">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-red-800 font-medium text-sm mb-1">Error Details:</h4>
                    <p className="text-red-700 text-sm leading-relaxed">{errorMessage}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-600 transition-all transform hover:scale-105 shadow-lg shadow-blue-500/25"
                >
                  <RefreshCw className="w-4 h-4 inline mr-2" />
                  Try Again
                </button>
              )}
              
              <button
                onClick={onBackToLogin}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all border border-gray-200"
              >
                <ArrowLeft className="w-4 h-4 inline mr-2" />
                Back to Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}