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

### 4. **Rewrite History & Analytics**
- Pro/Premium users get access to rewrite history
- Premium users get advanced analytics and insights
- Export functionality with tier-specific data access
- **Progressive disclosure**: Rewrite summary shown only when requested

### 5. **Subscription Management**
- Clear subscription status indicators with proper cancellation tracking
- Cancellation with grace period management based on billing cycles
- Billing history and usage analytics
- Reactivation capabilities with new billing cycle initialization

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
  billing_start_date timestamptz, -- NEW: When paid subscription billing started
  created_at timestamptz DEFAULT now()
);
```

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

### Row Level Security (RLS)

All tables have RLS enabled with policies ensuring users can only access their own data:

```sql
-- Example policy for writing_samples
CREATE POLICY "Users can read own writing samples"
  ON writing_samples
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
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

#### `TextRewriter.tsx`
- Main rewriting interface with centered, responsive layout
- Token usage validation and real-time feedback
- Progressive disclosure for rewrite summary and history
- Consistent button styling across all controls

#### `ToneControls.tsx`
- Subscription-based tone adjustment interface
- Progressive feature unlocking (Free → Pro → Premium)
- Preset management and custom fine-tuning

#### `SubscriptionManagement.tsx`
- Comprehensive subscription status display with proper cancellation tracking
- Cancellation and reactivation workflows based on billing cycles
- Billing history and usage analytics
- Enhanced status detection for expired subscriptions

#### `RewriteHistoryStats.tsx`
- Renamed from "Rewrite History & Analytics" to "Rewrite Summary"
- Shows only when explicitly requested via button click
- Subscription-aware analytics display

### Authentication & Security

#### `useAuth.ts`
- Centralized authentication state management
- Token usage tracking and validation with billing-based resets
- Enhanced error handling and user feedback
- Rewrite history saving with comprehensive logging

#### Security Features
- **Row Level Security**: Database-level access control
- **Subscription Validation**: Server-side feature access validation
- **Audit Logging**: Comprehensive security event tracking
- **Rate Limiting**: Protection against abuse
- **Input Validation**: Client and server-side validation

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

### Token Management

```typescript
// Token usage validation with billing-based resets
const updateTokens = async (tokensUsed: number) => {
  // Check subscription limits
  const limits = getSubscriptionLimits(user);
  
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

### Integration Testing
- Authentication flow
- Database operations
- API integrations

### Security Testing
- RLS policy validation
- Subscription bypass attempts
- Input validation and sanitization

## Performance Optimization

### Frontend Optimizations
- **Code Splitting**: Lazy loading of components
- **Memoization**: React.memo for expensive components
- **Bundle Optimization**: Vite's built-in optimizations

### Database Optimizations
- **Indexes**: Strategic indexing on frequently queried columns
- **RLS Optimization**: Efficient policy design
- **Connection Pooling**: Supabase's built-in pooling

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

### Monitoring & Analytics
- **Error Tracking**: Comprehensive error logging
- **Usage Analytics**: Token usage patterns and trends
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

## Contributing

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Configured for React and TypeScript
- **Prettier**: Consistent code formatting
- **Conventional Commits**: Structured commit messages

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

### Support Channels
- **Documentation**: Comprehensive user and developer guides
- **Community Forum**: User-to-user support and feature requests
- **Email Support**: Direct support for Pro and Premium users
- **Priority Support**: Dedicated support for Premium users

---

This documentation provides a comprehensive overview of the TweakMyText application architecture, implementation details, and operational procedures. For specific implementation questions or support, refer to the inline code comments and type definitions throughout the codebase.