import React, { useState } from 'react';
import { X, Lock, Eye, EyeOff, Check, AlertCircle, Crown, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

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

  const { user, signOut } = useAuth();

  if (!isOpen || !user) return null;

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
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
    setMessage({ type: 'info', text: 'Updating your password...' });

    try {
      // First, verify we have a valid session
      console.log('Verifying session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Session validation failed. Please sign out and sign back in.');
      }

      if (!session?.user) {
        console.error('No active session found');
        throw new Error('No active session found. Please sign out and sign back in.');
      }

      console.log('Valid session found, attempting password update...');
      
      // Use a Promise.race to implement timeout
      const updatePromise = supabase.auth.updateUser({
        password: newPassword
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Password update timed out after 15 seconds'));
        }, 15000);
      });

      // Race between update and timeout
      const updateResult = await Promise.race([updatePromise, timeoutPromise]) as any;

      console.log('Password update result:', { 
        success: !updateResult.error, 
        error: updateResult.error?.message,
        data: !!updateResult.data 
      });

      if (updateResult.error) {
        console.error('Password update failed:', updateResult.error);
        
        // Handle specific error cases
        let errorMessage = 'Password update failed. ';
        
        switch (updateResult.error.message) {
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
            errorMessage = 'Session expired. Please sign out and sign back in.';
            break;
          default:
            errorMessage += updateResult.error.message;
        }
        
        setMessage({ type: 'error', text: errorMessage });
      } else {
        console.log('Password updated successfully!');
        setMessage({ type: 'success', text: 'Password updated successfully!' });
        
        // Clear form
        setNewPassword('');
        setConfirmPassword('');
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        
        // Auto-clear success message and close modal after 2 seconds
        setTimeout(() => {
          setMessage(null);
          onClose();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Password update exception:', error);
      
      // Handle different types of errors
      let errorMessage = 'Password update failed. ';
      
      if (error.message === 'Password update timed out after 15 seconds') {
        errorMessage = 'Password update timed out. This might be a temporary issue. Please try signing out and back in, then try again.';
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('JWT') || error.message.includes('session')) {
        errorMessage = 'Session expired. Please sign out and sign back in.';
      } else if (error.message) {
        errorMessage = error.message;
      } else {
        errorMessage += 'Please try again or contact support.';
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      console.log('Password update process completed');
      setIsUpdating(false);
    }
  };

  const handleRefreshSession = async () => {
    try {
      setMessage({ type: 'info', text: 'Refreshing session...' });
      
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh error:', error);
        setMessage({ 
          type: 'error', 
          text: 'Failed to refresh session. Please sign out and sign back in.' 
        });
      } else {
        console.log('Session refreshed successfully');
        setMessage({ type: 'success', text: 'Session refreshed! You can now try updating your password.' });
        
        setTimeout(() => {
          setMessage(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Session refresh exception:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to refresh session. Please sign out and sign back in.' 
      });
    }
  };

  const handleSignOutAndRestart = async () => {
    try {
      setMessage({ type: 'info', text: 'Signing out...' });
      await signOut();
      onClose();
    } catch (error) {
      console.error('Sign out error:', error);
      setMessage({ type: 'error', text: 'Failed to sign out. Please refresh the page.' });
    }
  };

  const handleClose = () => {
    // Don't allow closing while updating
    if (isUpdating) {
      console.log('Cannot close modal while password update is in progress');
      return;
    }
    
    setNewPassword('');
    setConfirmPassword('');
    setMessage(null);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  const handleManageSubscriptionClick = () => {
    // Don't allow navigation while updating
    if (isUpdating) return;
    
    handleClose();
    onManageSubscription?.();
  };

  const isFormValid = newPassword.length >= 6 && 
                     confirmPassword.length >= 6 && 
                     newPassword === confirmPassword;

  return (
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
          <p className="text-gray-500 text-xs mt-1">
            Plan: <span className="text-blue-600 capitalize">{user.subscription_tier}</span>
          </p>
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRefreshSession}
                disabled={isUpdating}
                className="text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-2 py-1 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
              <button
                type="button"
                onClick={handleSignOutAndRestart}
                disabled={isUpdating}
                className="text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg px-2 py-1 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <LogOut className="w-3 h-3" />
                Sign Out
              </button>
            </div>
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
                  <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 animate-spin" />
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
                💡 If you're having timeout issues, try refreshing your session or signing out and back in
              </p>
            </div>
            {isUpdating && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                <p className="text-amber-700 text-xs text-center">
                  ⏳ Please wait while we update your password... (max 15 seconds)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}