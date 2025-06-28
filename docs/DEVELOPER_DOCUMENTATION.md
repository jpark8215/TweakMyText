# TweakMyText - Developer Documentation

## Project Overview

TweakMyText is a sophisticated AI-powered writing style rewriter that learns from user-provided writing samples to transform any text to match their unique voice and tone. Built with React, TypeScript, Tailwind CSS, and Supabase.

## Architecture

### Frontend Stack
- **React 18** with TypeScript for type safety
- **Tailwind CSS** for responsive, utility-first styling
- **Lucide React** for consistent iconography
- **Vite** for fast development and optimized builds

### Backend & Database
- **Supabase** for authentication, database, and real-time features
- **PostgreSQL** with Row Level Security (RLS) for data protection
- **Edge Functions** for serverless API endpoints (when needed)

### AI Integration
- **Claude API** (optional) for production-quality text rewriting
- **Fallback mock system** for development and demonstration

## Key Features

### 1. **Writing Style Analysis**
- Analyzes user writing samples to detect tone, formality, and style patterns
- Subscription-based analysis levels (Basic, Advanced, Extended)
- Real-time tone detection and style tag generation

### 2. **Subscription-Based Access Control**
- **Free Tier**: 3 writing samples, 1M tokens/month, basic analysis
- **Pro Tier**: 25 samples, 5M tokens/month, advanced analysis, rewrite history
- **Premium Tier**: 100 samples, 10M tokens/month, extended analysis, unlimited history

### 3. **Secure Token Management**
- Daily and monthly token limits with automatic resets
- Real-time usage tracking and validation
- Comprehensive security logging and audit trails
- **Billing-based resets**: Pro/Premium users get monthly resets based on billing start date, not user creation date

### 4. **Comprehensive Export Tracking System**
- **Free Tier**: 5 exports per month with strict enforcement
- **Pro Tier**: 200 exports per month with usage monitoring
- **Premium Tier**: Unlimited exports with analytics logging
- **Multi-source tracking**: Exports from both TextRewriter and RewriteHistoryModal are tracked
- Real-time export count updates and user feedback
- Comprehensive error handling and database synchronization

### 5. **Enhanced Rewrite History & Analytics**
- Pro/Premium users get access to rewrite history
- Premium users get advanced analytics and insights
- **Individual and bulk export functionality** with tier-specific data access
- **Progressive disclosure**: Rewrite summary shown only when requested
- **Single item exports**: Export individual rewrites from history with proper tracking

### 6. **Subscription Management**
- Clear subscription status indicators with proper cancellation tracking
- Cancellation with grace period management based on billing cycles
- Billing history and usage analytics
- Reactivation capabilities with new billing cycle initialization

### 7. **Advanced Tone Control System**
- **Intelligent tone filtering**: Only applies tone controls available to user's subscription tier
- **Graceful degradation**: Unavailable controls default to neutral (50) without errors
- **Subscription-aware validation**: Prevents errors when Pro users have Premium-only controls in their settings

## Database Schema

### Core Tables

#### `users`
```sql
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium')),
  tokens_remaining integer DEFAULT 100000 CHECK (tokens_remaining >= 0),
  daily_tokens_used integer DEFAULT 0 CHECK (daily_tokens_used >= 0),
  monthly_tokens_used integer DEFAULT 0 CHECK (monthly_tokens_used >= 0),
  monthly_exports_used integer DEFAULT 0 CHECK (monthly_exports_used >= 0),
  last_token_reset date DEFAULT CURRENT_DATE,
  monthly_reset_date integer DEFAULT EXTRACT(day FROM CURRENT_DATE),
  subscription_expires_at timestamptz,
  billing_start_date timestamptz, -- When paid subscription billing started
  created_at timestamptz DEFAULT now()
);
```

**Indexes:**
- `users_pkey` - Primary key on id
- `users_email_key` - Unique index on email

**Constraints:**
- `users_tokens_remaining_check` - tokens_remaining >= 0
- `users_daily_tokens_used_check` - daily_tokens_used >= 0
- `users_monthly_tokens_used_check` - monthly_tokens_used >= 0
- `users_monthly_exports_used_check` - monthly_exports_used >= 0
- `users_subscription_tier_check` - subscription_tier IN ('free', 'pro', 'premium')
- `users_email_key` - UNIQUE (email)
- `users_pkey` - PRIMARY KEY (id)

**RLS Policies:**
- `Users can read own profile` - SELECT for authenticated users where auth.uid() = id
- `Users can update own profile` - UPDATE for authenticated users where auth.uid() = id
- `Users can insert own profile` - INSERT for authenticated users where auth.uid() = id

**Foreign Keys:**
- `users_id_fkey` - FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE

#### `writing_samples`
```sql
CREATE TABLE writing_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

**Indexes:**
- `writing_samples_pkey` - Primary key on id
- `idx_writing_samples_user_id` - Index on user_id for faster queries

**Constraints:**
- `writing_samples_pkey` - PRIMARY KEY (id)

**RLS Policies:**
- `Users can read own writing samples` - SELECT for authenticated users where auth.uid() = user_id
- `Users can insert own writing samples` - INSERT for authenticated users where auth.uid() = user_id
- `Users can update own writing samples` - UPDATE for authenticated users where auth.uid() = user_id
- `Users can delete own writing samples` - DELETE for authenticated users where auth.uid() = user_id

**Foreign Keys:**
- `writing_samples_user_id_fkey` - FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

#### `rewrite_history`
```sql
CREATE TABLE rewrite_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_text text NOT NULL,
  rewritten_text text NOT NULL,
  confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  style_tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
```

**Indexes:**
- `rewrite_history_pkey` - Primary key on id
- `idx_rewrite_history_user_id` - Index on user_id
- `idx_rewrite_history_created_at` - Index on created_at DESC for chronological ordering
- `idx_rewrite_history_user_created` - Composite index on (user_id, created_at DESC)

**Constraints:**
- `rewrite_history_confidence_check` - CHECK (confidence >= 0 AND confidence <= 100)
- `rewrite_history_pkey` - PRIMARY KEY (id)

**RLS Policies:**
- `Users can read own rewrite history` - SELECT for authenticated users where auth.uid() = user_id
- `Users can insert own rewrite history` - INSERT for authenticated users where auth.uid() = user_id

**Foreign Keys:**
- `rewrite_history_user_id_fkey` - FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

#### `billing_history`
```sql
CREATE TABLE billing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  currency text DEFAULT 'USD' NOT NULL,
  status text NOT NULL CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
  description text NOT NULL,
  subscription_tier text NOT NULL,
  stripe_payment_id text,
  created_at timestamptz DEFAULT now()
);
```

**Indexes:**
- `billing_history_pkey` - Primary key on id
- `idx_billing_history_user_id` - Index on user_id
- `idx_billing_history_created_at` - Index on created_at DESC
- `idx_billing_history_status` - Index on status

**Constraints:**
- `billing_history_amount_check` - CHECK (amount >= 0)
- `billing_history_pkey` - PRIMARY KEY (id)
- `billing_history_status_check` - CHECK (status IN ('paid', 'pending', 'failed', 'refunded'))
- `billing_history_subscription_tier_check` - CHECK (subscription_tier IN ('free', 'pro', 'premium'))

**RLS Policies:**
- `Users can read own billing history` - SELECT for authenticated users where auth.uid() = user_id
- `System can insert billing records` - INSERT with CHECK (true) for system operations

**Foreign Keys:**
- `billing_history_user_id_fkey` - FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

#### `security_audit_log`
```sql
CREATE TABLE security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource text NOT NULL,
  allowed boolean NOT NULL,
  subscription_tier text NOT NULL,
  ip_address text,
  user_agent text,
  error_message text,
  created_at timestamptz DEFAULT now()
);
```

**Indexes:**
- `security_audit_log_pkey` - Primary key on id
- `idx_security_audit_log_user_id` - Index on user_id
- `idx_security_audit_log_created_at` - Index on created_at DESC
- `idx_security_audit_log_action` - Index on action
- `idx_security_audit_log_allowed` - Index on allowed

**Constraints:**
- `security_audit_log_pkey` - PRIMARY KEY (id)

**RLS Policies:**
- `Users can read own audit logs` - SELECT for authenticated users where user_id = auth.uid()
- `System can insert audit logs` - INSERT for authenticated and anon users with CHECK (true)
- `Admins can read audit logs` - SELECT for authenticated users with USING (false) - currently disabled

**Foreign Keys:**
- `security_audit_log_user_id_fkey` - FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL

### Database Functions

#### Token Management Functions

##### `reset_daily_tokens()`
```sql
CREATE OR REPLACE FUNCTION reset_daily_tokens()
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET 
    tokens_remaining = CASE 
      WHEN subscription_tier = 'free' THEN LEAST(100000, 1000000 - COALESCE(monthly_tokens_used, 0))
      ELSE tokens_remaining 
    END,
    daily_tokens_used = 0,
    last_token_reset = CURRENT_DATE
  WHERE 
    subscription_tier = 'free' 
    AND COALESCE(last_token_reset, '1970-01-01'::date) < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;
```

##### `reset_monthly_tokens()`
```sql
CREATE OR REPLACE FUNCTION reset_monthly_tokens()
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET 
    monthly_tokens_used = 0,
    monthly_exports_used = 0,
    tokens_remaining = CASE 
      WHEN subscription_tier = 'free' THEN 100000
      WHEN subscription_tier = 'pro' THEN 5000000
      WHEN subscription_tier = 'premium' THEN 10000000
      ELSE tokens_remaining
    END,
    daily_tokens_used = CASE
      WHEN subscription_tier = 'free' THEN 0
      ELSE COALESCE(daily_tokens_used, 0)
    END,
    last_token_reset = CURRENT_DATE
  WHERE should_reset_monthly_tokens(id);
END;
$$ LANGUAGE plpgsql;
```

#### Billing and Subscription Functions

##### `get_next_billing_date(p_user_id uuid)`
```sql
CREATE OR REPLACE FUNCTION get_next_billing_date(p_user_id uuid)
RETURNS timestamptz AS $$
DECLARE
  user_record users%ROWTYPE;
  next_billing timestamptz;
  billing_start timestamptz;
BEGIN
  SELECT * INTO user_record FROM users WHERE id = p_user_id;
  
  IF user_record.subscription_tier = 'free' THEN
    RETURN NULL;
  END IF;
  
  billing_start := COALESCE(user_record.billing_start_date, user_record.created_at);
  
  next_billing := billing_start;
  WHILE next_billing <= CURRENT_TIMESTAMP LOOP
    next_billing := next_billing + INTERVAL '1 month';
  END LOOP;
  
  RETURN next_billing;
END;
$$ LANGUAGE plpgsql;
```

##### `should_reset_monthly_tokens(p_user_id uuid)`
```sql
CREATE OR REPLACE FUNCTION should_reset_monthly_tokens(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  user_record users%ROWTYPE;
  billing_start timestamptz;
  last_reset_date date;
  current_billing_period_start timestamptz;
BEGIN
  SELECT * INTO user_record FROM users WHERE id = p_user_id;
  
  IF user_record.subscription_tier = 'free' THEN
    RETURN EXTRACT(DAY FROM CURRENT_DATE) = user_record.monthly_reset_date
           AND user_record.last_token_reset < CURRENT_DATE;
  END IF;
  
  billing_start := COALESCE(user_record.billing_start_date, user_record.created_at);
  last_reset_date := user_record.last_token_reset;
  
  current_billing_period_start := billing_start;
  WHILE current_billing_period_start + INTERVAL '1 month' <= CURRENT_TIMESTAMP LOOP
    current_billing_period_start := current_billing_period_start + INTERVAL '1 month';
  END LOOP;
  
  RETURN last_reset_date < current_billing_period_start::date;
END;
$$ LANGUAGE plpgsql;
```

##### `update_subscription_tier(user_id, tier, billing_start)`
```sql
CREATE OR REPLACE FUNCTION update_subscription_tier(
  p_user_id uuid,
  p_new_tier text,
  p_billing_start timestamptz DEFAULT CURRENT_TIMESTAMP
)
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET 
    subscription_tier = p_new_tier,
    billing_start_date = CASE 
      WHEN p_new_tier IN ('pro', 'premium') THEN p_billing_start
      ELSE NULL
    END,
    tokens_remaining = CASE 
      WHEN p_new_tier = 'free' THEN 100000
      WHEN p_new_tier = 'pro' THEN 5000000
      WHEN p_new_tier = 'premium' THEN 10000000
      ELSE tokens_remaining
    END,
    monthly_tokens_used = 0,
    daily_tokens_used = 0,
    monthly_exports_used = 0,
    last_token_reset = CURRENT_DATE
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Analytics Functions

##### `get_rewrite_stats(p_user_id uuid)`
```sql
CREATE OR REPLACE FUNCTION get_rewrite_stats(p_user_id uuid)
RETURNS TABLE(
  total_rewrites bigint,
  this_month bigint,
  last_rewrite timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_rewrites,
    COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)) as this_month,
    MAX(created_at) as last_rewrite
  FROM rewrite_history 
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Security Functions

##### `log_security_event()`
```sql
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id uuid,
  p_action text,
  p_resource text,
  p_allowed boolean,
  p_subscription_tier text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_error_message text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO security_audit_log (
    user_id,
    action,
    resource,
    allowed,
    subscription_tier,
    ip_address,
    user_agent,
    error_message
  ) VALUES (
    p_user_id,
    p_action,
    p_resource,
    p_allowed,
    p_subscription_tier,
    p_ip_address,
    p_user_agent,
    p_error_message
  );
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

##### `validate_subscription_access()`
```sql
CREATE OR REPLACE FUNCTION validate_subscription_access(
  p_user_id uuid,
  p_action text,
  p_required_tier text
)
RETURNS boolean AS $$
DECLARE
  user_tier text;
  access_granted boolean := false;
BEGIN
  SELECT subscription_tier INTO user_tier
  FROM users
  WHERE id = p_user_id;

  CASE p_required_tier
    WHEN 'pro' THEN
      access_granted := user_tier IN ('pro', 'premium');
    WHEN 'premium' THEN
      access_granted := user_tier = 'premium';
    ELSE
      access_granted := true;
  END CASE;

  PERFORM log_security_event(
    p_user_id,
    p_action,
    'tone_controls',
    access_granted,
    COALESCE(user_tier, 'unknown'),
    NULL,
    NULL,
    CASE WHEN NOT access_granted THEN 
      format('Access denied: %s requires %s subscription, user has %s', 
             p_action, p_required_tier, COALESCE(user_tier, 'no subscription'))
    ELSE NULL END
  );

  RETURN access_granted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### User Management Functions

##### `handle_new_user()`
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    subscription_tier,
    tokens_remaining,
    daily_tokens_used,
    monthly_tokens_used,
    monthly_exports_used,
    last_token_reset,
    monthly_reset_date
  )
  VALUES (
    new.id,
    new.email,
    'free',
    100000,
    0,
    0,
    0,
    CURRENT_DATE,
    EXTRACT(DAY FROM CURRENT_DATE)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Trigger:**
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

## Component Architecture

### Core Components

#### `App.tsx`
- Main application component with routing logic
- Handles authentication state and view management
- Manages global modals (auth, settings, pricing)

#### `StyleCapture.tsx`
- Writing sample collection and management
- Subscription-aware sample limits
- Real-time save status with error handling
- **Input sanitization**: Validates and sanitizes user input before saving

#### `TextRewriter.tsx`
- Main rewriting interface with centered, responsive layout
- Token usage validation and real-time feedback
- **Enhanced export tracking**: Comprehensive logging and error handling for all subscription tiers
- **Centralized export service**: Uses ExportService for consistent export handling
- Progressive disclosure for rewrite summary and history
- Consistent button styling across all controls

#### `ToneControls.tsx`
- Subscription-based tone adjustment interface
- **Intelligent tone filtering**: Only shows controls available to user's tier
- **Graceful degradation**: Handles unavailable controls without errors
- **Performance optimized**: Uses React.memo, useCallback, and useMemo
- Progressive feature unlocking (Free → Pro → Premium)
- Preset management and custom fine-tuning

#### `SubscriptionManagement.tsx`
- Comprehensive subscription status display with proper cancellation tracking
- Cancellation and reactivation workflows based on billing cycles
- Billing history and usage analytics
- Enhanced status detection for expired subscriptions

#### `RewriteHistoryModal.tsx`
- **Paginated history loading**: Loads history in chunks to prevent performance issues
- **Enhanced export functionality**: Both bulk and individual item exports
- **Comprehensive export tracking**: All exports update database and local state
- **Tier-aware export limits**: Shows remaining exports for Free/Pro, unlimited for Premium
- **Real-time export validation**: Prevents exceeding limits before file creation
- Subscription-aware analytics display
- **Individual export buttons**: Export single rewrites with proper tracking

#### `RewriteHistoryStats.tsx`
- Renamed from "Rewrite History & Analytics" to "Rewrite Summary"
- Shows only when explicitly requested via button click
- Subscription-aware analytics display

#### `PasswordChangeConfirmation.tsx`
- Improved password change flow with proper state management
- Fixed "Back to Login" functionality with proper cleanup
- Prevents race conditions with AbortController
- Provides clear feedback on password change status

### Authentication & Security

#### `useAuth.ts`
- Centralized authentication state management
- **Memory leak prevention**: Uses mountedRef to prevent state updates after unmount
- **Token validation with consistent limits**: Uses getExpectedTokensForTier for consistent token limits
- **Enhanced export tracking**: Comprehensive logging, proper tier handling, and database synchronization
- **Detailed security logging**: All export attempts logged with success/failure status
- Enhanced error handling and user feedback
- Rewrite history saving with comprehensive logging

#### Security Features
- **Row Level Security**: Database-level access control
- **Subscription Validation**: Server-side feature access validation
- **Audit Logging**: Comprehensive security event tracking
- **Rate Limiting**: Protection against abuse
- **Input Validation**: Client and server-side validation
- **Secure Logging**: Sanitizes sensitive information in logs

### Utility Services

#### `errorHandler.ts`
- **AppError class**: Standardized error handling with severity levels
- **handleError function**: Converts unknown errors to AppError instances
- **secureLog function**: Sanitizes sensitive data in logs
- **checkRateLimit function**: Prevents abuse through rate limiting

#### `inputSanitizer.ts`
- **sanitizeInput**: General input sanitization
- **sanitizeTitle**: Specific sanitization for writing sample titles
- **sanitizeContent**: Specific sanitization for writing sample content
- Prevents XSS attacks and other injection vulnerabilities

#### `exportService.ts`
- **Centralized export handling**: Single service for all export operations
- **Consistent validation**: Validates export limits before file creation
- **Proper error handling**: Standardized error handling for all export operations
- **Comprehensive logging**: Detailed logging of all export attempts

## Subscription System

### Tier Comparison

| Feature | Free | Pro | Premium |
|---------|------|-----|---------|
| Writing Samples | 3 | 25 | 100 |
| Monthly Tokens | 1M | 5M | 10M |
| Daily Token Limit | 100K | Unlimited | Unlimited |
| Tone Controls | View-only | 6 controls | 10 controls |
| Rewrite History | No | Yes | Yes + Analytics |
| Processing Speed | 1x | 2x | 3x |
| Monthly Exports | 5 | 200 | Unlimited |

### Enhanced Export Tracking System

The export system has been completely redesigned for accuracy and reliability across all export sources:

#### Export Limits by Tier
- **Free Tier**: 5 exports per month with strict enforcement
- **Pro Tier**: 200 exports per month with usage monitoring
- **Premium Tier**: Unlimited exports (tracked for analytics only)

#### Export Sources Tracked
1. **TextRewriter Component**: Export rewrite results
2. **RewriteHistoryModal**: 
   - Export all history (bulk export)
   - Export individual rewrite items

#### Centralized Export Service
```typescript
export class ExportService {
  private updateExports: (count: number) => Promise<{ error: Error | null }>;
  
  constructor(updateExportsFunction: (count: number) => Promise<{ error: Error | null }>) {
    this.updateExports = updateExportsFunction;
  }
  
  async exportData(data: any, filename: string, user: User): Promise<void> {
    secureLog('Export attempt:', {
      userTier: user.subscription_tier,
      currentExports: user.monthly_exports_used,
      filename: filename.replace(/[^a-zA-Z0-9.-]/g, '[SANITIZED]')
    });
    
    // Validate export limits
    await this.validateExportLimits(user);
    
    // Create and download file
    await this.createAndDownloadFile(data, filename);
    
    // Update export count
    const { error } = await this.updateExports(1);
    if (error) {
      secureLog('Export count update failed:', { error: error.message });
      throw error;
    }
    
    secureLog('Export completed successfully');
  }
  
  private async validateExportLimits(user: User): Promise<void> {
    const limits = getSubscriptionLimits(user);
    
    if (limits.exportLimit === -1) {
      // Unlimited exports for Premium
      return;
    }
    
    const currentExports = user.monthly_exports_used || 0;
    if (currentExports >= limits.exportLimit) {
      throw new Error(`Monthly export limit reached (${limits.exportLimit} exports)`);
    }
  }
  
  private async createAndDownloadFile(data: any, filename: string): Promise<void> {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      secureLog('File creation failed:', { error });
      throw new Error('Failed to create export file');
    }
  }
}
```

#### Export Process Flow
1. **User initiates export** (from TextRewriter or RewriteHistoryModal)
2. **Pre-export validation**: Check tier limits and current usage
3. **File generation**: Create export file with subscription-appropriate data
4. **Database update**: Increment export count for Free/Pro users
5. **State synchronization**: Update local user state
6. **Comprehensive logging**: Track all export attempts and outcomes

### Token Management

```typescript
// Token usage validation with billing-based resets
const updateTokens = async (tokensUsed: number) => {
  // Get subscription limits with corrected values
  const getSubscriptionLimits = () => {
    switch (user.subscription_tier) {
      case 'pro':
        return { dailyLimit: -1, monthlyLimit: 5000000 }; // No daily limit for Pro
      case 'premium':
        return { dailyLimit: -1, monthlyLimit: 10000000 }; // No daily limit for Premium
      default:
        return { dailyLimit: 100000, monthlyLimit: 1000000 }; // Free tier: 100K daily, 1M monthly
    }
  };

  const limits = getSubscriptionLimits();
  
  // For Pro/Premium: Check if monthly reset is due based on billing cycle
  if (user.subscription_tier !== 'free') {
    const shouldReset = await supabase.rpc('should_reset_monthly_tokens', { p_user_id: user.id });
    if (shouldReset) {
      await supabase.rpc('reset_monthly_tokens');
    }
  }
  
  // Validate daily/monthly limits
  if (user.subscription_tier === 'free' && user.daily_tokens_used >= limits.dailyLimit) {
    throw new Error('Daily token limit reached');
  }
  
  if (user.monthly_tokens_used >= limits.monthlyLimit) {
    throw new Error('Monthly token limit reached');
  }
  
  // Update usage and log
  await supabase.from('users').update({
    tokens_remaining: user.tokens_remaining - tokensUsed,
    daily_tokens_used: user.daily_tokens_used + tokensUsed,
    monthly_tokens_used: user.monthly_tokens_used + tokensUsed
  });
};
```

### Subscription Status Management

The system tracks detailed subscription status including:
- **Active subscriptions** with next billing dates calculated from billing start date
- **Cancelled subscriptions** with grace periods ending at next billing cycle
- **Expired subscriptions** with proper detection and reactivation options
- **Billing history** with payment status tracking

### Billing Cycle Management

#### Key Functions

- `get_next_billing_date(user_id)`: Calculates next billing based on billing start date
- `should_reset_monthly_tokens(user_id)`: Determines if monthly reset is due based on billing cycles
- `update_subscription_tier(user_id, tier, billing_start)`: Handles tier changes with proper billing date tracking

#### How It Works

1. **Free Users**: Continue using user creation date for monthly resets (day of month)
2. **Pro/Premium Users**: Use billing start date for monthly token resets
3. **New Subscriptions**: Billing start date is set when upgrading to paid tier
4. **Cancellations**: End at next billing date calculated from billing start
5. **Reactivations**: Start new billing cycle from reactivation date

## AI Integration

### Claude API Integration
```typescript
const rewriteWithClaude = async (
  originalText: string,
  samples: WritingSample[],
  toneSettings: ToneSettings,
  apiKey: string,
  analysisLevel: 'basic' | 'advanced' | 'extended',
  processingPriority: number
) => {
  // Subscription-aware prompt generation
  const prompt = generatePrompt(samples, toneSettings, analysisLevel);
  
  // Priority-based model configuration
  const modelConfig = getModelConfig(processingPriority, analysisLevel);
  
  // API call with error handling
  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelConfig.model,
      max_tokens: modelConfig.maxTokens,
      temperature: modelConfig.temperature,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  
  return processResponse(response);
};
```

### Enhanced Tone Control System

The tone control system now includes intelligent filtering to prevent subscription-related errors:

```typescript
// Create filtered tone settings that only include available controls
const limits = getSubscriptionLimits(user);
const filteredToneSettings: ToneSettings = {
  formality: 50, casualness: 50, enthusiasm: 50, technicality: 50,
  creativity: 50, empathy: 50, confidence: 50, humor: 50, urgency: 50, clarity: 50
};

// Only include tone settings for controls available to the user's tier
Object.keys(toneSettings).forEach(key => {
  if (limits.availableToneControls.includes(key) || !limits.canModifyTone) {
    filteredToneSettings[key as keyof ToneSettings] = toneSettings[key as keyof ToneSettings];
  }
  // For unavailable controls, keep default value (50)
});
```

### Fallback Mock System
When Claude API is unavailable, the system uses a sophisticated mock that:
- Simulates subscription-appropriate processing times
- Applies basic text transformations based on detected style
- Generates realistic confidence scores and style tags

## Security Implementation

### Access Control Validation
```typescript
export const validateToneAccess = (user: User | null, action: string): void => {
  const limits = getSubscriptionLimits(user);

  switch (action) {
    case 'modify_tone':
      if (!limits.canModifyTone) {
        throw new Error('Tone customization requires Pro or Premium subscription');
      }
      break;
    case 'use_advanced_presets':
      if (!limits.canUseAdvancedPresets) {
        throw new Error('Advanced tone presets require Premium subscription');
      }
      break;
    // Additional validations...
  }
};
```

### Enhanced Tone Settings Validation
```typescript
export const validateToneSettings = (user: User | null, toneSettings: any): void => {
  const limits = getSubscriptionLimits(user);

  // Free users cannot modify any tone settings
  if (!limits.canModifyTone) {
    const hasCustomSettings = Object.keys(toneSettings).some(
      key => Math.abs(toneSettings[key] - 50) > 5 // Allow 5% tolerance for auto-detection
    );

    if (hasCustomSettings) {
      throw new Error('Custom tone settings require Pro or Premium subscription. Free users have view-only access.');
    }
    return;
  }

  // For Pro/Premium users, only validate significantly modified unavailable controls
  const unavailableControlsInUse = Object.keys(toneSettings).filter(control => {
    if (limits.availableToneControls.includes(control)) {
      return false; // Control is available, no issue
    }
    
    // Check if the control has been significantly modified from default
    const value = toneSettings[control];
    const defaultValue = 50;
    const isSignificantlyModified = Math.abs(value - defaultValue) > 10; // Allow 10% tolerance
    
    return isSignificantlyModified;
  });

  if (unavailableControlsInUse.length > 0) {
    const tierName = user?.subscription_tier === 'pro' ? 'Premium' : 'Pro or Premium';
    throw new Error(`The following tone controls require ${tierName} subscription: ${unavailableControlsInUse.join(', ')}`);
  }
};
```

### Security Logging
```typescript
export const logSecurityEvent = async (event: SecurityEvent): Promise<void> => {
  await supabase.rpc('log_security_event', {
    p_user_id: event.userId,
    p_action: event.action,
    p_resource: event.resource,
    p_allowed: event.allowed,
    p_subscription_tier: event.subscriptionTier,
    p_error_message: event.errorMessage || null,
  });
};
```

### Secure Logging
```typescript
export const secureLog = (message: string, data?: any) => {
  if (import.meta.env.DEV) {
    // Sanitize sensitive data in development
    const sanitizedData = data ? sanitizeLogData(data) : undefined;
    console.log(message, sanitizedData);
  }
};

const sanitizeLogData = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  
  const sensitive = ['password', 'email', 'token', 'key', 'secret'];
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeLogData(item));
  }
  
  return Object.keys(data).reduce((acc, key) => {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      acc[key] = '[REDACTED]';
    } else if (typeof data[key] === 'object') {
      acc[key] = sanitizeLogData(data[key]);
    } else {
      acc[key] = data[key];
    }
    return acc;
  }, {} as any);
};
```

### Input Sanitization
```typescript
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .substring(0, 10000); // Limit length
};

export const sanitizeTitle = (title: string): string => {
  if (!title || typeof title !== 'string') return '';
  
  return title
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .substring(0, 200); // Limit title length
};

export const sanitizeContent = (content: string): string => {
  if (!content || typeof content !== 'string') return '';
  
  return content
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .substring(0, 50000); // Limit content length
};
```

## UI/UX Design Principles

### Responsive Layout
- **Centered Design**: All main controls (tokens, tone controls, rewrite summary) are centered regardless of screen size
- **Progressive Disclosure**: Information is revealed only when needed (e.g., rewrite summary appears only when button is clicked)
- **Consistent Styling**: All buttons use consistent white/gray styling with proper hover states

### User Experience
- **Clear Status Indicators**: Subscription status, cancellation tracking, and expiration dates are prominently displayed
- **Intuitive Navigation**: Logical flow from style capture to rewriting to history management
- **Accessibility**: Proper contrast ratios, keyboard navigation, and screen reader support

### Button Layout
- **Centered Controls**: Tone controls, rewrite summary, and view history buttons are centered
- **Consistent Styling**: All control buttons use white/gray background with proper hover states
- **Clear Hierarchy**: Primary actions (rewrite) use gradient backgrounds, secondary actions use neutral colors

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account and project

### Environment Variables
```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Claude API (Optional)
VITE_CLAUDE_API_KEY=your_claude_api_key
```

### Installation
```bash
# Clone repository
git clone <repository-url>
cd tweakmytext

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

### Database Setup
1. Create Supabase project
2. Run migrations in order from `supabase/migrations/`
3. Enable RLS on all tables
4. Configure authentication settings

## Testing Strategy

### Unit Testing
- Component rendering and interaction
- Utility function validation
- Subscription logic verification
- **Export tracking validation**: Test export limits and database updates

### Integration Testing
- Authentication flow
- Database operations
- API integrations
- **Export workflow testing**: End-to-end export process validation from all sources

### Security Testing
- RLS policy validation
- Subscription bypass attempts
- Input validation and sanitization

## Performance Optimization

### Frontend Optimizations
- **Code Splitting**: Lazy loading of components
- **Memoization**: React.memo for expensive components like ToneControls
- **Bundle Optimization**: Vite's built-in optimizations

### Database Optimizations
- **Indexes**: Strategic indexing on frequently queried columns
- **RLS Optimization**: Efficient policy design
- **Connection Pooling**: Supabase's built-in pooling
- **Pagination**: Implemented in RewriteHistoryModal to prevent loading all history at once

### Caching Strategy
- **Browser Caching**: Static assets with proper headers
- **API Response Caching**: Subscription status and user data
- **Local Storage**: Non-sensitive user preferences

## Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] RLS policies tested
- [ ] Claude API key configured (if using)
- [ ] Error monitoring setup
- [ ] Performance monitoring enabled
- [ ] Export tracking functionality tested across all sources
- [ ] Password change flow tested with timeout handling

### Monitoring & Analytics
- **Error Tracking**: Comprehensive error logging
- **Usage Analytics**: Token usage patterns and trends
- **Export Analytics**: Export usage patterns by subscription tier across all sources
- **Performance Metrics**: Response times and user engagement
- **Security Monitoring**: Failed authentication attempts and suspicious activity

## API Documentation

### Supabase Functions

#### `get_rewrite_stats(p_user_id uuid)`
Returns rewrite statistics for a user:
```sql
SELECT 
  COUNT(*) as total_rewrites,
  COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)) as this_month,
  MAX(created_at) as last_rewrite
FROM rewrite_history 
WHERE user_id = p_user_id;
```

#### `get_next_billing_date(p_user_id uuid)`
Calculates next billing date based on billing start date for Pro/Premium users.

#### `should_reset_monthly_tokens(p_user_id uuid)`
Determines if monthly token reset is due based on billing cycles.

#### `reset_daily_tokens()`
Resets daily token usage for free users when appropriate.

#### `reset_monthly_tokens()`
Resets monthly token usage based on billing cycles (Pro/Premium) or user anniversary dates (Free).

#### `update_subscription_tier(user_id, tier, billing_start)`
Handles subscription tier changes with proper billing date tracking.

## Troubleshooting

### Common Issues

#### Authentication Problems
- Check Supabase URL and anon key
- Verify RLS policies are correctly configured
- Ensure user profile creation triggers are working

#### Token Limit Issues
- Verify token reset functions are running with correct billing cycles
- Check subscription tier calculations
- Validate usage tracking accuracy

#### Export Tracking Issues
- **Symptoms**: Export counts not updating, incorrect limits shown
- **Solutions**: 
  - Check database `monthly_exports_used` field updates
  - Verify `updateExports` function is being called for all export sources
  - Review console logs for export tracking errors
  - Ensure RLS policies allow export count updates
  - Test exports from both TextRewriter and RewriteHistoryModal

#### Tone Control Errors
- **Symptoms**: "Premium subscription required" errors for Pro users
- **Solutions**:
  - Check tone settings filtering in `secureRewriteText`
  - Verify `availableToneControls` array for user's tier
  - Ensure tone validation allows reasonable tolerance for defaults

#### Password Change Issues
- **Symptoms**: "Password update timed out" errors, but password was actually changed
- **Solutions**:
  - Check AbortController implementation in SettingsModal
  - Verify timeout handling and cleanup
  - Ensure proper state management during password change flow
  - Test with network throttling to simulate slow connections

#### Rewrite History Not Saving
- Check RLS policies on rewrite_history table
- Verify user authentication state
- Check for database connection issues

#### Subscription Status Issues
- Verify subscription expiration date handling based on billing cycles
- Check cancellation status detection logic
- Ensure proper grace period calculations based on billing start dates

### Debug Tools
- Browser developer tools for client-side debugging
- Supabase dashboard for database inspection
- Security audit log for access control debugging
- **Export tracking logs**: Console logs in browser for export process debugging

### Export Tracking Debugging
```typescript
// Enable detailed export logging in browser console
secureLog('Export attempt:', {
  userTier: user.subscription_tier,
  currentExports: user.monthly_exports_used,
  hasResult: !!result,
  exportSource: 'TextRewriter' // or 'RewriteHistoryModal'
});

// Check database state
SELECT id, email, subscription_tier, monthly_exports_used 
FROM users 
WHERE id = 'user-id';

// Verify export limits
const limits = getSubscriptionLimits(user);
console.log('Export limits:', limits);
```

## Contributing

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Configured for React and TypeScript
- **Prettier**: Consistent code formatting
- **Conventional Commits**: Structured commit messages
- **Unit Tests**: Required for critical functionality

### Pull Request Process
1. Create feature branch from main
2. Implement changes with tests
3. Update documentation as needed
4. Submit PR with detailed description
5. Address review feedback
6. Merge after approval

## Future Enhancements

### Planned Features
- **Bulk Operations**: Process multiple texts simultaneously (Premium)
- **Style Templates**: Save and reuse custom style configurations
- **Team Collaboration**: Share writing samples within organizations
- **Advanced Analytics**: Detailed writing improvement insights
- **API Access**: RESTful API for third-party integrations
- **Enhanced Export Formats**: PDF, DOCX, and other formats for Premium users

### Technical Improvements
- **Real-time Collaboration**: WebSocket-based live editing
- **Offline Support**: Progressive Web App capabilities
- **Mobile App**: React Native implementation
- **Advanced AI**: Custom model fine-tuning for enterprise users

## Support & Maintenance

### Regular Maintenance Tasks
- **Database Cleanup**: Archive old audit logs and expired data
- **Performance Monitoring**: Track and optimize slow queries
- **Security Updates**: Regular dependency updates and security patches
- **Backup Verification**: Ensure data backup integrity
- **Export Analytics Review**: Monitor export usage patterns and optimize limits across all sources

### Support Channels
- **Documentation**: Comprehensive user and developer guides
- **Community Forum**: User-to-user support and feature requests
- **Email Support**: Direct support for Pro and Premium users
- **Priority Support**: Dedicated support for Premium users

---

This documentation provides a comprehensive overview of the TweakMyText application architecture, implementation details, and operational procedures. For specific implementation questions or support, refer to the inline code comments and type definitions throughout the codebase.