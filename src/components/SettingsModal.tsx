import React, { useState } from 'react';
import { X, Lock, Eye, EyeOff, Check, AlertCircle, Crown, Star, Zap } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import PasswordChangeConfirmation from './PasswordChangeConfirmation';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onManageSubscription?: () => void;
}

export default function SettingsModal({ isOpen, onClose, onManageSubscription }: SettingsModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  // Password change confirmation states
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [passwordChangeStatus, setPasswordChangeStatus] = useState<'success' | 'error' | 'loading' | null>(null);
  const [passwordChangeError, setPasswordChangeError] = useState<string>('');

  const { user, signOut } = useAuth();

  if (!isOpen || !user) return null;

  const logPasswordChangeAttempt = (success: boolean, errorDetails?: string) => {
    const logData = {
      timestamp: new Date().toISOString(),
      userId: user.id,
      userEmail: user.email,
      success,
      errorDetails: errorDetails || null,
      userAgent: navigator.userAgent,
      sessionId: crypto.randomUUID()
    };

    console.log('Password Change Attempt:', logData);
    
    // In production, send to your logging service
    // Example: analytics.track('password_change_attempt', logData);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isUpdating) {
      console.log('Password update already in progress, ignoring submission');
      return;
    }
    
    setMessage(null);

    // Validation
    if (!newPassword.trim()) {
      setMessage({ type: 'error', text: 'Please enter a new password' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    console.log('Starting password update process...');
    setIsUpdating(true);
    setShowPasswordConfirmation(true);
    setPasswordChangeStatus('loading');
    setPasswordChangeError('');

    // Create an AbortController to handle cancellation
    const abortController = new AbortController();
    let timeoutId: NodeJS.Timeout | null = null;
    let updateCompleted = false;

    try {
      console.log('Checking current session...');
      
      // Set a timeout that can be cancelled
      timeoutId = setTimeout(() => {
        if (!updateCompleted) {
          console.log('Password update timeout reached');
          abortController.abort();
          setPasswordChangeStatus('error');
          setPasswordChangeError('Password update timed out. Please try again.');
          logPasswordChangeAttempt(false, 'Timeout after 30 seconds');
          setIsUpdating(false);
        }
      }, 30000); // 30 second timeout

      // Get current session with better error handling
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (abortController.signal.aborted) return;
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error(`Session validation failed: ${sessionError.message}`);
      }

      if (!session?.user) {
        console.error('No active session found');
        throw new Error('No active session found. Please sign out and sign back in.');
      }

      console.log('Valid session found, updating password...');
      
      // Update password with abort signal
      const updatePromise = supabase.auth.updateUser({
        password: newPassword
      });

      const { data, error: updateError } = await updatePromise;

      // Mark update as completed to prevent timeout
      updateCompleted = true;
      
      // Clear timeout since we got a response
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (abortController.signal.aborted) return;

      console.log('Password update result:', { 
        success: !updateError, 
        error: updateError?.message,
        data: !!data 
      });

      if (updateError) {
        console.error('Password update failed:', updateError);
        
        // Handle specific error cases with better messaging
        let errorMessage = 'Password update failed. ';
        
        switch (updateError.message) {
          case 'New password should be different from the old password.':
            errorMessage = 'New password must be different from your current password.';
            break;
          case 'Password should be at least 6 characters.':
            errorMessage = 'Password must be at least 6 characters long.';
            break;
          case 'Unable to validate email address: invalid format':
            errorMessage = 'Account validation error. Please contact support.';
            break;
          case 'Invalid login credentials':
            errorMessage = 'Authentication failed. Please sign out and sign back in.';
            break;
          case 'User not found':
            errorMessage = 'User account not found. Please sign out and sign back in.';
            break;
          case 'JWT expired':
            errorMessage = 'Your session has expired. Please sign out and sign back in.';
            break;
          default:
            errorMessage += updateError.message;
        }
        
        setPasswordChangeStatus('error');
        setPasswordChangeError(errorMessage);
        logPasswordChangeAttempt(false, errorMessage);
      } else {
        console.log('Password updated successfully!');
        setPasswordChangeStatus('success');
        logPasswordChangeAttempt(true);
        
        // Clear form
        setNewPassword('');
        setConfirmPassword('');
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        setMessage(null);
      }
    } catch (error: any) {
      updateCompleted = true;
      
      // Clear timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      if (abortController.signal.aborted) {
        console.log('Password update was aborted due to timeout');
        return;
      }
      
      console.error('Password update exception:', error);
      
      // Handle different types of errors with better messaging
      let errorMessage = 'An unexpected error occurred. ';
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message?.includes('JWT')) {
        errorMessage = 'Your session has expired. Please sign out and sign back in.';
      } else if (error.message?.includes('session')) {
        errorMessage = 'Session error. Please sign out and sign back in.';
      } else if (error.message) {
        errorMessage = error.message;
      } else {
        errorMessage += 'Please try again or contact support.';
      }
      
      setPasswordChangeStatus('error');
      setPasswordChangeError(errorMessage);
      logPasswordChangeAttempt(false, errorMessage);
    } finally {
      console.log('Password update process completed');
      setIsUpdating(false);
      
      // Ensure timeout is cleared
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };

  const handleClose = () => {
    // Don't allow closing while updating
    if (isUpdating) {
      console.log('Cannot close modal while update is in progress');
      return;
    }
    
    setNewPassword('');
    setConfirmPassword('');
    setMessage(null);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setShowPasswordConfirmation(false);
    setPasswordChangeStatus(null);
    setPasswordChangeError('');
    onClose();
  };

  const handleManageSubscriptionClick = () => {
    // Don't allow navigation while updating
    if (isUpdating) return;
    
    handleClose();
    onManageSubscription?.();
  };

  const handleBackToLogin = async () => {
    console.log('Settings: Handling back to login after password change');
    try {
      // First close all modals
      setShowPasswordConfirmation(false);
      setPasswordChangeStatus(null);
      setPasswordChangeError('');
      handleClose();
      
      // Then sign out
      console.log('Settings: Signing out user...');
      const { error } = await signOut();
      if (error) {
        console.error('Sign out error during password change flow:', error);
      } else {
        console.log('Settings: User signed out successfully after password change');
      }
    } catch (error) {
      console.error('Error during back to login flow:', error);
      // Even if there's an error, close the modals
      setShowPasswordConfirmation(false);
      setPasswordChangeStatus(null);
      setPasswordChangeError('');
      handleClose();
    }
  };

  const handleRetryPasswordChange = () => {
    console.log('Settings: Retrying password change');
    setShowPasswordConfirmation(false);
    setPasswordChangeStatus(null);
    setPasswordChangeError('');
    setIsUpdating(false);
  };

  const isFormValid = newPassword.length >= 6 && 
                     confirmPassword.length >= 6 && 
                     newPassword === confirmPassword;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 lg:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Settings</h2>
            </div>
            <button
              onClick={handleClose}
              disabled={isUpdating}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Account Info */}
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h3 className="text-gray-800 font-medium mb-2 text-sm sm:text-base">Account Information</h3>
            <p className="text-gray-600 text-xs sm:text-sm break-all">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-500 text-xs">Plan:</span>
              <span className={`text-xs font-medium capitalize px-2 py-1 rounded-full ${
                user.subscription_tier === 'premium' ? 'bg-amber-100 text-amber-700' :
                user.subscription_tier === 'pro' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {user.subscription_tier}
              </span>
            </div>
          </div>

          {/* Subscription Management */}
          <div className="mb-4 sm:mb-6">
            <button
              onClick={handleManageSubscriptionClick}
              disabled={isUpdating}
              className="w-full flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium hover:from-indigo-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-lg shadow-indigo-500/25 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
              Manage Subscription
            </button>
          </div>

          {/* Password Change Form */}
          <form onSubmit={handlePasswordUpdate} className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-800 font-medium text-sm sm:text-base">Change Password</h3>
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isUpdating}
                  className="w-full pl-9 sm:pl-10 pr-10 sm:pr-12 py-2.5 sm:py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter new password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={isUpdating}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
              </div>
              {newPassword && newPassword.length < 6 && (
                <p className="text-xs text-amber-600 mt-1">Password must be at least 6 characters</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isUpdating}
                  className="w-full pl-9 sm:pl-10 pr-10 sm:pr-12 py-2.5 sm:py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isUpdating}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
              </div>
              {confirmPassword && newPassword && confirmPassword !== newPassword && (
                <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
              )}
            </div>

            {message && (
              <div className={`p-3 rounded-lg border ${
                message.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                  : message.type === 'info'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-red-50 border-red-200 text-red-600'
              }`}>
                <div className="flex items-center gap-2">
                  {message.type === 'success' ? (
                    <Check className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  ) : message.type === 'info' ? (
                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  )}
                  <span className="text-xs sm:text-sm">{message.text}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isUpdating || !isFormValid}
              className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg shadow-blue-500/25 text-sm sm:text-base"
            >
              {isUpdating ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Updating Password...
                </div>
              ) : (
                'Update Password'
              )}
            </button>
          </form>

          <div className="mt-4 sm:mt-6 pt-3 sm:pt-6 border-t border-gray-200">
            <div className="space-y-2">
              <p className="text-gray-500 text-xs text-center">
                Password changes take effect immediately. You will remain signed in.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                <p className="text-blue-700 text-xs text-center">
                  💡 If you experience login issues, try signing out and back in
                </p>
              </div>
              {isUpdating && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                  <p className="text-amber-700 text-xs text-center">
                    ⏳ Please wait while we process your request (max 30 seconds)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Confirmation Modal */}
      <PasswordChangeConfirmation
        isVisible={showPasswordConfirmation}
        status={passwordChangeStatus}
        errorMessage={passwordChangeError}
        onBackToLogin={handleBackToLogin}
        onRetry={handleRetryPasswordChange}
      />
    </>
  );
}