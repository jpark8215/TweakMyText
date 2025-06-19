import React, { useState } from 'react';
import { X, Lock, Eye, EyeOff, Check, AlertCircle, Crown } from 'lucide-react';
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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { user } = useAuth();

  if (!isOpen || !user) return null;

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isUpdating) return;
    
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

    setIsUpdating(true);

    try {
      console.log('Starting password update...');
      
      // Use a timeout to prevent infinite hanging
      const updatePromise = supabase.auth.updateUser({
        password: newPassword
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Password update timed out')), 10000); // 10 second timeout
      });

      const { error } = await Promise.race([updatePromise, timeoutPromise]) as any;

      console.log('Password update completed, error:', error);

      if (error) {
        console.error('Password update error:', error);
        
        // Handle specific error cases
        if (error.message?.includes('same_password')) {
          setMessage({ type: 'error', text: 'New password must be different from your current password' });
        } else if (error.message?.includes('weak_password')) {
          setMessage({ type: 'error', text: 'Password is too weak. Please choose a stronger password' });
        } else if (error.message?.includes('signup_disabled')) {
          setMessage({ type: 'error', text: 'Password updates are currently disabled' });
        } else if (error.message?.includes('timeout')) {
          setMessage({ type: 'error', text: 'Password update timed out. Please try again' });
        } else {
          setMessage({ type: 'error', text: error.message || 'Failed to update password. Please try again.' });
        }
      } else {
        console.log('Password updated successfully');
        setMessage({ type: 'success', text: 'Password updated successfully!' });
        setNewPassword('');
        setConfirmPassword('');
        
        // Auto-close success message after 3 seconds
        setTimeout(() => {
          setMessage(null);
        }, 3000);
      }
    } catch (error: any) {
      console.error('Unexpected error during password update:', error);
      
      if (error.message?.includes('timeout')) {
        setMessage({ 
          type: 'error', 
          text: 'Password update timed out. Please check your connection and try again.' 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: 'An unexpected error occurred. Please try again.' 
        });
      }
    } finally {
      console.log('Setting isUpdating to false');
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    // Don't allow closing while updating
    if (isUpdating) return;
    
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
          <h3 className="text-gray-800 font-medium mb-3 sm:mb-4 text-sm sm:text-base">Change Password</h3>
          
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
                : 'bg-red-50 border-red-200 text-red-600'
            }`}>
              <div className="flex items-center gap-2">
                {message.type === 'success' ? (
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
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
                💡 Choose a strong password with at least 6 characters
              </p>
            </div>
            {isUpdating && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                <p className="text-amber-700 text-xs text-center">
                  ⏳ Please wait while we update your password...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}