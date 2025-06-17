import { supabase } from '../lib/supabase';
import { User } from '../types';

export interface SecurityEvent {
  userId: string;
  action: string;
  resource: string;
  allowed: boolean;
  subscriptionTier: string;
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
}

export const logSecurityEvent = async (event: SecurityEvent): Promise<void> => {
  try {
    const { error } = await supabase.rpc('log_security_event', {
      p_user_id: event.userId,
      p_action: event.action,
      p_resource: event.resource,
      p_allowed: event.allowed,
      p_subscription_tier: event.subscriptionTier,
      p_ip_address: event.ipAddress || null,
      p_user_agent: event.userAgent || null,
      p_error_message: event.errorMessage || null,
    });

    if (error) {
      console.error('Failed to log security event:', error);
    }
  } catch (error) {
    console.error('Security logging error:', error);
  }
};

export const validateAndLogToneAccess = async (
  user: User | null,
  action: string,
  resource: string = 'tone_controls'
): Promise<boolean> => {
  if (!user) {
    await logSecurityEvent({
      userId: 'anonymous',
      action,
      resource,
      allowed: false,
      subscriptionTier: 'none',
      errorMessage: 'No authenticated user',
    });
    return false;
  }

  try {
    const { data: accessGranted, error } = await supabase.rpc('check_tone_control_access', {
      p_user_id: user.id,
      p_action: action,
    });

    if (error) {
      console.error('Access validation error:', error);
      await logSecurityEvent({
        userId: user.id,
        action,
        resource,
        allowed: false,
        subscriptionTier: user.subscription_tier,
        errorMessage: `Validation error: ${error.message}`,
      });
      return false;
    }

    return accessGranted || false;
  } catch (error) {
    console.error('Security validation failed:', error);
    await logSecurityEvent({
      userId: user.id,
      action,
      resource,
      allowed: false,
      subscriptionTier: user.subscription_tier,
      errorMessage: `System error during validation: ${error}`,
    });
    return false;
  }
};

export const logSubscriptionBypassAttempt = async (
  user: User | null,
  attemptedAction: string,
  requiredTier: string
): Promise<void> => {
  if (!user) return;

  await logSecurityEvent({
    userId: user.id,
    action: 'subscription_bypass_attempt',
    resource: attemptedAction,
    allowed: false,
    subscriptionTier: user.subscription_tier,
    errorMessage: `Attempted to access ${attemptedAction} which requires ${requiredTier} subscription`,
  });
};

export const logSuccessfulAccess = async (
  user: User | null,
  action: string,
  resource: string = 'tone_controls'
): Promise<void> => {
  if (!user) return;

  await logSecurityEvent({
    userId: user.id,
    action,
    resource,
    allowed: true,
    subscriptionTier: user.subscription_tier,
  });
};

// Rate limiting helper
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (userId: string, action: string, maxAttempts: number = 10, windowMs: number = 60000): boolean => {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const userLimit = rateLimitMap.get(key);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (userLimit.count >= maxAttempts) {
    return false;
  }

  userLimit.count++;
  return true;
};

export const logRateLimitViolation = async (
  user: User | null,
  action: string
): Promise<void> => {
  if (!user) return;

  await logSecurityEvent({
    userId: user.id,
    action: 'rate_limit_violation',
    resource: action,
    allowed: false,
    subscriptionTier: user.subscription_tier,
    errorMessage: `Rate limit exceeded for action: ${action}`,
  });
};