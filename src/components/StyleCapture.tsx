import React, { useState, useEffect } from 'react';
import { Plus, X, FileText, Sparkles, ChevronRight, Zap, Trash2, Save, AlertCircle } from 'lucide-react';
import { WritingSample } from '../types';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface StyleCaptureProps {
  samples: WritingSample[];
  onSamplesChange: (samples: WritingSample[]) => void;
  onNext: () => void;
}

export default function StyleCapture({ samples, onSamplesChange, onNext }: StyleCaptureProps) {
  const [newSample, setNewSample] = useState({ title: '', content: '' });
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();

  // Load saved samples when user is logged in
  useEffect(() => {
    if (user) {
      loadSavedSamples();
    }
  }, [user]);

  const getSubscriptionLimits = () => {
    if (!user) return { maxSamples: 3, canSave: false };
    
    switch (user.subscription_tier) {
      case 'premium':
        return { maxSamples: 100, canSave: true };
      case 'pro':
        return { maxSamples: 25, canSave: true };
      default:
        return { maxSamples: 3, canSave: true };
    }
  };

  const limits = getSubscriptionLimits();

  const loadSavedSamples = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('writing_samples')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const loadedSamples: WritingSample[] = data.map(sample => ({
        id: sample.id,
        title: sample.title,
        content: sample.content,
        createdAt: new Date(sample.created_at),
        saved: true
      }));

      onSamplesChange(loadedSamples);
    } catch (error) {
      console.error('Error loading samples:', error);
      setError('Failed to load your writing samples. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const addSample = async () => {
    if (!newSample.content.trim() || !newSample.title.trim()) return;

    // Check subscription limits
    if (samples.length >= limits.maxSamples) {
      const upgradeMessage = user?.subscription_tier === 'free' 
        ? 'Upgrade to Pro for 25 samples or Premium for 100 samples.'
        : user?.subscription_tier === 'pro'
        ? 'Upgrade to Premium for 100 samples.'
        : 'Please delete some samples to add new ones.';
      
      setError(`You've reached your limit of ${limits.maxSamples} writing samples. ${upgradeMessage}`);
      return;
    }

    const tempId = crypto.randomUUID();
    const sample: WritingSample = {
      id: tempId,
      title: newSample.title,
      content: newSample.content,
      createdAt: new Date(),
      saved: false
    };
    
    // Optimistically add to local state
    const updatedSamples = [...samples, sample];
    onSamplesChange(updatedSamples);
    setNewSample({ title: '', content: '' });
    setError(null);

    // Save to database if user is logged in
    if (user && limits.canSave) {
      setSavingId(tempId);
      try {
        const { data, error } = await supabase
          .from('writing_samples')
          .insert({
            user_id: user.id,
            title: sample.title,
            content: sample.content
          })
          .select()
          .single();

        if (error) throw error;

        // Update local state with the database ID and mark as saved
        const finalSamples = updatedSamples.map(s => 
          s.id === tempId 
            ? { ...s, id: data.id, saved: true, createdAt: new Date(data.created_at) }
            : s
        );
        onSamplesChange(finalSamples);
      } catch (error) {
        console.error('Error saving sample:', error);
        setError('Failed to save sample to your account. It will be lost when you refresh.');
        
        // Mark as unsaved in local state
        const errorSamples = updatedSamples.map(s => 
          s.id === tempId ? { ...s, saved: false } : s
        );
        onSamplesChange(errorSamples);
      } finally {
        setSavingId(null);
      }
    }
  };

  const saveSampleToDatabase = async (sample: WritingSample) => {
    if (!user || sample.saved) return;

    setSavingId(sample.id);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('writing_samples')
        .insert({
          user_id: user.id,
          title: sample.title,
          content: sample.content
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state with database ID and mark as saved
      const updatedSamples = samples.map(s => 
        s.id === sample.id 
          ? { ...s, id: data.id, saved: true, createdAt: new Date(data.created_at) }
          : s
      );
      onSamplesChange(updatedSamples);
    } catch (error) {
      console.error('Error saving sample:', error);
      setError('Failed to save sample. Please try again.');
    } finally {
      setSavingId(null);
    }
  };

  const removeSample = async (sampleId: string) => {
    const sample = samples.find(s => s.id === sampleId);
    if (!sample) return;

    setError(null);

    if (sample.saved && user) {
      // Delete from database
      setDeletingId(sampleId);
      try {
        const { error } = await supabase
          .from('writing_samples')
          .delete()
          .eq('id', sampleId)
          .eq('user_id', user.id);

        if (error) throw error;

        // Remove from local state only after successful deletion
        onSamplesChange(samples.filter(s => s.id !== sampleId));
      } catch (error) {
        console.error('Error deleting sample:', error);
        setError('Failed to delete sample. Please try again.');
      } finally {
        setDeletingId(null);
      }
    } else {
      // Just remove from local state if not saved
      onSamplesChange(samples.filter(s => s.id !== sampleId));
    }
  };

  const canProceed = samples.length >= 2;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-2xl mb-4 animate-pulse shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600">Loading your writing samples...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-6 sm:mb-8 lg:mb-12 pt-4 sm:pt-6">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-xl sm:rounded-2xl lg:rounded-3xl mb-4 sm:mb-6 shadow-2xl">
          <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" />
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-gray-800 via-gray-700 to-gray-600 bg-clip-text text-transparent mb-3 sm:mb-4 px-2 sm:px-4 leading-tight">
          Capture Your Writing Style
        </h1>
        <div className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed px-2 sm:px-4">
          <div className="mb-1 sm:mb-2">Add 2-3 samples of your writing</div>
          <div>so we can learn your unique voice and tone</div>
        </div>
        {user && (
          <div className="mt-3 sm:mt-4 space-y-1 sm:space-y-2">
            <p className="text-sm text-blue-600">
              ✨ Your samples are automatically saved to your account
            </p>
            <p className="text-xs text-gray-500">
              {limits.maxSamples === Infinity 
                ? `${samples.length} samples saved (Unlimited)`
                : limits.maxSamples === 100
                ? `${samples.length}/${limits.maxSamples} samples used (Premium)`
                : `${samples.length}/${limits.maxSamples} samples used`
              }
            </p>
          </div>
        )}
      </div>

      {/* Subscription Limit Warning */}
      {user && samples.length >= limits.maxSamples - 5 && limits.maxSamples !== Infinity && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-amber-800 font-medium text-sm sm:text-base">
                {samples.length >= limits.maxSamples 
                  ? 'Sample limit reached' 
                  : 'Approaching sample limit'
                }
              </p>
              <p className="text-amber-700 text-xs sm:text-sm">
                {samples.length >= limits.maxSamples 
                  ? `You've reached your limit of ${limits.maxSamples} samples. Delete some samples or upgrade your plan.`
                  : `You can add ${limits.maxSamples - samples.length} more sample${limits.maxSamples - samples.length === 1 ? '' : 's'}.`
                }
                {user.subscription_tier === 'free' && (
                  <span className="block mt-1">
                    Upgrade to Pro for 25 samples or Premium for 100 samples.
                  </span>
                )}
                {user.subscription_tier === 'pro' && (
                  <span className="block mt-1">
                    Upgrade to Premium for 100 samples.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-600 text-xs mt-1 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Existing Samples */}
      <div className="grid gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
        {samples.map((sample, index) => (
          <div key={sample.id} className="bg-white/80 backdrop-blur-xl rounded-lg sm:rounded-xl lg:rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-lg hover:shadow-xl hover:bg-white/90 transition-all duration-300">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center text-white text-xs sm:text-sm lg:text-base font-bold shadow-lg flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-800 text-sm sm:text-base lg:text-lg truncate">{sample.title}</h3>
                    {sample.saved && (
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full flex-shrink-0" title="Saved to your account" />
                    )}
                  </div>
                  {!sample.saved && user && (
                    <p className="text-xs text-amber-600">Not saved yet</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-2">
                {!sample.saved && user && (
                  <button
                    onClick={() => saveSampleToDatabase(sample)}
                    disabled={savingId === sample.id}
                    className="text-emerald-600 hover:text-emerald-700 transition-colors p-1 sm:p-1.5 lg:p-2 hover:bg-emerald-50 rounded-lg disabled:opacity-50"
                    title="Save to your account"
                  >
                    {savingId === sample.id ? (
                      <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => removeSample(sample.id)}
                  disabled={deletingId === sample.id}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1 sm:p-1.5 lg:p-2 hover:bg-red-50 rounded-lg disabled:opacity-50"
                  title="Delete sample"
                >
                  {deletingId === sample.id ? (
                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                  )}
                </button>
              </div>
            </div>
            <p className="text-gray-600 leading-relaxed line-clamp-3 mb-3 text-xs sm:text-sm lg:text-base">{sample.content}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Zap className="w-3 h-3" />
              {sample.content.split(' ').length} words
              {sample.saved && (
                <>
                  <span className="mx-1">•</span>
                  <span className="text-emerald-600">Saved</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add New Sample */}
      <div className="bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-xl rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-200 shadow-lg">
        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-md sm:rounded-lg lg:rounded-xl flex items-center justify-center">
            <FileText className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
          </div>
          <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-800">Add Writing Sample</h3>
        </div>
        
        <div className="space-y-3 sm:space-y-4 lg:space-y-6">
          <input
            type="text"
            placeholder="Sample title (e.g., 'Email to colleague', 'Blog post excerpt')"
            value={newSample.title}
            onChange={(e) => setNewSample({ ...newSample, title: e.target.value })}
            disabled={samples.length >= limits.maxSamples}
            className="w-full px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 rounded-md sm:rounded-lg lg:rounded-xl bg-white border border-gray-200 text-gray-800 placeholder-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all backdrop-blur-sm text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
          />
          
          <textarea
            placeholder="Paste your writing sample here (100-300 words recommended)..."
            value={newSample.content}
            onChange={(e) => setNewSample({ ...newSample, content: e.target.value })}
            rows={4}
            disabled={samples.length >= limits.maxSamples}
            className="w-full px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 rounded-md sm:rounded-lg lg:rounded-xl bg-white border border-gray-200 text-gray-800 placeholder-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all resize-none backdrop-blur-sm text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
          />
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <span className="text-sm text-gray-500 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              {newSample.content.split(' ').filter(w => w.trim()).length} words
            </span>
            <button
              onClick={addSample}
              disabled={!newSample.content.trim() || !newSample.title.trim() || savingId !== null || samples.length >= limits.maxSamples}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-md sm:rounded-lg lg:rounded-xl font-medium hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg shadow-blue-500/25 text-sm sm:text-base"
            >
              <Plus className="w-4 h-4" />
              {samples.length >= limits.maxSamples ? 'Limit Reached' : 'Add Sample'}
              {user && samples.length < limits.maxSamples && <span className="text-xs opacity-75">(Auto-save)</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <div className="mt-6 sm:mt-8 lg:mt-12 text-center">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-3 sm:gap-4 px-6 sm:px-8 lg:px-10 py-3 sm:py-4 lg:py-5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-lg sm:rounded-xl lg:rounded-2xl font-semibold text-sm sm:text-base lg:text-lg hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-2xl shadow-purple-500/25"
        >
          Continue to Rewriter
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
        </button>
        {!canProceed && (
          <p className="text-sm text-gray-500 mt-2 sm:mt-3 lg:mt-4 px-4">Add at least 2 writing samples to continue</p>
        )}
      </div>

      {/* Sign in prompt for non-authenticated users */}
      {!user && samples.length > 0 && (
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
          <p className="text-blue-700 text-sm">
            💡 Sign in to save your writing samples and access them anytime!
          </p>
        </div>
      )}
    </div>
  );
}