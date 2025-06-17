# TweakMyText Developer Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Authentication & Authorization](#authentication--authorization)
5. [Subscription System](#subscription-system)
6. [Credit System](#credit-system)
7. [Security & Audit System](#security--audit-system)
8. [API Integration](#api-integration)
9. [Component Structure](#component-structure)
10. [State Management](#state-management)
11. [Deployment](#deployment)
12. [Development Setup](#development-setup)
13. [Testing](#testing)
14. [Performance Considerations](#performance-considerations)
15. [Security](#security)
16. [Troubleshooting](#troubleshooting)

## Project Overview

TweakMyText is an AI-powered writing style rewriter application that analyzes user writing samples to learn their unique voice and tone, then transforms any input text to match that style. The application features a freemium subscription model with three tiers: Free, Pro, and Premium.

### Key Features
- **Writing Style Analysis**: AI-powered analysis of user writing samples with subscription-based analysis levels
- **Text Rewriting**: Transform any text to match learned writing style with priority processing
- **Tone Controls**: Subscription-gated adjustable parameters for formality, casualness, enthusiasm, and technicality
- **Subscription Tiers**: Free, Pro, and Premium with different feature sets and security controls
- **Credit System**: Usage-based billing with daily/monthly limits and comprehensive tracking
- **Export Functionality**: Export results in multiple formats with subscription-based limits
- **Rewrite History**: Track and access previous rewrites with security audit trails
- **Security Audit System**: Comprehensive logging and monitoring of user actions and subscription access

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI Integration**: Claude API (with fallback mock implementation)
- **Deployment**: Netlify
- **Security**: Row Level Security (RLS) + Audit Logging

## Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │────│   Supabase      │────│   Claude API    │
│   (Frontend)    │    │   (Backend)     │    │   (AI Service)  │
│                 │    │   + Security    │    │                 │
│                 │    │   + Audit Log   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Hierarchy
```
App
├── AuthModal
├── SettingsModal
├── PricingModal
├── UserMenu
├── StyleCapture
│   └── WritingSample Management (with subscription limits)
├── TextRewriter
│   ├── ToneControls (subscription-gated)
│   └── ComparisonView
├── SubscriptionManagement
└── Security Layer (validation & logging)
```

### Data Flow with Security
1. User authenticates via Supabase Auth (logged)
2. Writing samples stored in `writing_samples` table (with subscription limits)
3. Style analysis performed on samples (subscription-level dependent)
4. Text rewriting via Claude API or mock service (with priority processing)
5. Results stored in `rewrite_history` table (with audit trail)
6. Credit/export tracking in `users` table (with security validation)
7. All actions logged in `security_audit_log` table

## Database Schema

### Tables Overview

#### `users` Table
Primary user information and subscription details.

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium')),
  credits_remaining integer DEFAULT 3 CHECK (credits_remaining >= 0),
  daily_credits_used integer DEFAULT 0 CHECK (daily_credits_used >= 0),
  monthly_credits_used integer DEFAULT 0 CHECK (monthly_credits_used >= 0),
  monthly_exports_used integer DEFAULT 0 CHECK (monthly_exports_used >= 0),
  last_credit_reset date DEFAULT CURRENT_DATE,
  monthly_reset_date integer DEFAULT EXTRACT(DAY FROM CURRENT_DATE),
  subscription_expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

#### `writing_samples` Table
User's writing samples for style analysis.

```sql
CREATE TABLE writing_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

#### `rewrite_history` Table
Historical record of all text rewrites.

```sql
CREATE TABLE rewrite_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_text text NOT NULL,
  rewritten_text text NOT NULL,
  confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  style_tags text[] NOT NULL DEFAULT '{}',
  credits_used integer DEFAULT 1 CHECK (credits_used > 0),
  created_at timestamptz DEFAULT now()
);
```

#### `security_audit_log` Table (NEW)
Comprehensive security and access logging.

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
- `auth.uid() = user_id` for data access
- `auth.uid() = id` for user profile access
- Security audit logs are write-only for users, read-only for future admin roles

### Database Functions

#### `reset_daily_credits()`
Resets daily credits for free tier users at midnight UTC.

#### `reset_monthly_credits()`
Resets monthly credits and exports on user's signup anniversary.

#### `log_security_event()` (NEW)
Logs security events and access attempts to the audit table.

#### `validate_subscription_access()` (NEW)
Validates user subscription tier against required access level and logs attempts.

#### `check_tone_control_access()` (NEW)
Specifically validates tone control access and logs security events.

## Authentication & Authorization

### Supabase Auth Integration
- Email/password authentication
- No email confirmation required
- Automatic user profile creation on signup
- JWT-based session management
- **NEW**: Comprehensive security event logging for all auth actions

### User Profile Management
```typescript
interface User {
  id: string;
  email: string;
  subscription_tier: 'free' | 'pro' | 'premium';
  credits_remaining: number;
  daily_credits_used: number;
  monthly_credits_used: number;
  monthly_exports_used: number;
  last_credit_reset: string;
  monthly_reset_date: number;
  subscription_expires_at?: Date;
  created_at: Date;
}
```

### Authentication Hook with Security Logging
The `useAuth` hook provides:
- User state management
- Sign in/up/out functions (with security logging)
- Credit management (with audit trails)
- Export tracking (with access validation)
- **NEW**: Automatic security event logging for all user actions

## Subscription System

### Tier Comparison

| Feature | Free | Pro | Premium |
|---------|------|-----|---------|
| Monthly Rewrites | 90 (3/day) | 200 | 300 |
| Writing Samples | 3 | 25 | 100 |
| Monthly Exports | 5 | 200 | Unlimited |
| Processing Speed | 1x | 2x | 3x |
| Style Analysis | Basic | Advanced | Extended |
| Tone Controls | **View-Only** | **Manual + Presets** | **Custom Fine-Tuning** |
| Daily Limits | Yes | No | No |
| History Access | No | Yes | Yes |
| Support | Community | Email | Priority |

### **NEW**: Subscription Security & Validation

#### Subscription Limits Implementation
```typescript
interface SubscriptionLimits {
  canModifyTone: boolean;           // NEW: Tone modification access
  canUsePresets: boolean;           // NEW: Basic preset access
  canUseAdvancedPresets: boolean;   // NEW: Advanced preset access
  hasAdvancedAnalysis: boolean;
  hasExtendedAnalysis: boolean;
  hasPriorityProcessing: boolean;
  processingPriority: 'standard' | 'priority' | 'premium';
  maxWritingSamples: number;
  dailyLimit: number;
  monthlyLimit: number;
  exportLimit: number;
}
```

#### Tone Control Access Matrix
- **Free Tier**: View-only tone controls (auto-detected from samples)
- **Pro Tier**: Manual tone adjustment + basic presets
- **Premium Tier**: Full custom fine-tuning + advanced presets

#### Security Validation Functions
```typescript
// Validate tone control access
validateToneAccess(user: User | null, action: string): void

// Validate preset usage
validatePresetAccess(user: User | null, presetName: string): void

// Validate tone settings modifications
validateToneSettings(user: User | null, toneSettings: ToneSettings): void
```

## Credit System

### Credit Management with Security
- **Free Tier**: 3 credits/day, 90/month max (with daily limit enforcement)
- **Pro Tier**: 200 credits/month, no daily limit (with security validation)
- **Premium Tier**: 300 credits/month, no daily limit (with audit logging)

### **NEW**: Security-Enhanced Credit Tracking
```typescript
const updateCredits = async (creditsUsed: number) => {
  // 1. Log credit usage attempt
  await logSecurityEvent({
    userId: user.id,
    action: 'credit_usage_attempt',
    resource: 'credits',
    allowed: true,
    subscriptionTier: user.subscription_tier,
  });

  // 2. Validate subscription limits
  // 3. Check daily/monthly limits with security logging
  // 4. Update credits with audit trail
  // 5. Log successful usage or limit violations
};
```

### Reset Logic with Audit Trails
- **Daily Reset**: Midnight UTC for free users only (logged)
- **Monthly Reset**: On signup anniversary day (logged)
- **Automatic Resets**: Handled by database functions with security events

## Security & Audit System

### **NEW**: Comprehensive Security Logging

#### Security Event Types
- Authentication events (sign in/out, failures)
- Credit usage and limit violations
- Export attempts and restrictions
- Tone control access attempts
- Subscription bypass attempts
- Rate limiting violations

#### Security Logger Implementation
```typescript
interface SecurityEvent {
  userId: string;
  action: string;
  resource: string;
  allowed: boolean;
  subscriptionTier: string;
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
}

// Log security events
await logSecurityEvent(event: SecurityEvent): Promise<void>

// Validate and log tone access
await validateAndLogToneAccess(user: User, action: string): Promise<boolean>

// Log subscription bypass attempts
await logSubscriptionBypassAttempt(user: User, action: string, requiredTier: string): Promise<void>
```

#### Rate Limiting
- Built-in rate limiting for security-sensitive actions
- Automatic logging of rate limit violations
- Configurable limits per action type

#### Access Control Matrix
```typescript
// Tone Control Actions
'modify_tone'          -> Requires Pro/Premium
'use_presets'          -> Requires Pro/Premium  
'use_advanced_presets' -> Requires Premium
'advanced_analysis'    -> Requires Pro/Premium
'extended_analysis'    -> Requires Premium
'priority_processing'  -> Requires Pro/Premium
```

## API Integration

### **NEW**: Secure Claude API Integration
Enhanced Claude API integration with subscription-based features.

```typescript
const rewriteWithClaude = async (
  originalText: string,
  samples: WritingSample[],
  toneSettings: ToneSettings,
  apiKey: string,
  analysisLevel: 'basic' | 'advanced' | 'extended' = 'basic',
  processingPriority: number = 3
): Promise<RewriteResult>
```

#### Analysis Levels
- **Basic**: Free tier - fundamental style analysis
- **Advanced**: Pro tier - detailed pattern analysis + tone consistency
- **Extended**: Premium tier - comprehensive linguistic analysis + advanced features

#### Processing Priority
- **Standard (3)**: Free tier - standard processing speed
- **Priority (2)**: Pro tier - 2x faster processing
- **Premium (1)**: Premium tier - 3x faster processing + best model configuration

### **NEW**: Secure Mock Implementation
Fallback service with subscription-appropriate features and security validation.

```typescript
const secureRewriteText = async (
  originalText: string,
  samples: WritingSample[],
  toneSettings: ToneSettings,
  user: User | null
): Promise<RewriteResult>
```

## Component Structure

### **NEW**: Security-Enhanced Core Components

#### `TextRewriter.tsx`
Enhanced text rewriting interface with security:
- Subscription validation before rewriting
- Security error handling and display
- Secure tone settings management
- Audit trail for all rewrite operations

#### `ToneControls.tsx`
**MAJOR UPDATE**: Subscription-gated tone control interface:
- **Free Tier**: View-only controls with upgrade prompts
- **Pro Tier**: Manual adjustment + basic presets
- **Premium Tier**: Full customization + advanced presets
- Real-time subscription validation
- Security logging for all access attempts

#### **NEW**: Security Validation Layer
- `subscriptionValidator.ts`: Centralized subscription validation
- `securityLogger.ts`: Comprehensive security event logging
- `secureStyleAnalyzer.ts`: Subscription-aware style analysis

### Modal Components

#### `AuthModal.tsx`
Authentication interface with security logging:
- Sign in/up forms with failure logging
- Error handling with security events
- Welcome messaging

#### `SettingsModal.tsx`
User settings management:
- Password updates (with security logging)
- Account information
- Subscription management links

#### `PricingModal.tsx`
Enhanced subscription tier comparison:
- **Updated**: Clear tone control feature differentiation
- Feature comparison with security implications
- Upgrade flows

## State Management

### **NEW**: Security-Aware State Management
- Component-level state using `useState`
- **NEW**: Security error state management
- **NEW**: Subscription validation state
- Form state management with validation
- UI state (modals, loading, errors, security alerts)

### Global State with Security
- User authentication via `useAuth` hook (with security logging)
- Writing samples passed between components (with subscription limits)
- **NEW**: Subscription limits computed with security validation
- **NEW**: Security event tracking

### Data Persistence with Audit Trails
- Writing samples: Supabase database (with access logging)
- User preferences: Local storage
- Session state: Supabase Auth (with security events)
- **NEW**: Security audit logs: Permanent database storage

## Deployment

### **NEW**: Production Deployment Information
- **Primary Platform**: Netlify
- **Live URL**: https://magenta-profiterole-cbb39d.netlify.app
- **Build Process**: Automated via Netlify
- **Environment**: Production-ready with security features

### Environment Variables
```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Claude API Configuration (Optional)
VITE_CLAUDE_API_KEY=your_claude_api_key_here
```

### Build Process
```bash
npm run build
```

### Deployment Targets
- **Netlify**: Primary deployment platform (DEPLOYED)
- **Vercel**: Alternative platform
- **Static hosting**: Any static file server

### **NEW**: Security Considerations for Production
- Environment variables properly configured
- Security audit logging enabled
- Rate limiting active
- Subscription validation enforced
- All security policies enabled

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Claude API key (optional)

### Installation
```bash
# Clone repository
git clone <repository-url>
cd tweakmytext

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### **NEW**: Database Setup with Security
1. Create Supabase project
2. Run migrations in order:
   - `20250610021118_lucky_trail.sql` (users table)
   - `20250610021127_blue_night.sql` (writing_samples table)
   - `20250610021136_sunny_ember.sql` (rewrite_history table)
   - `20250610022549_green_cloud.sql` (credit system)
   - `20250613022528_round_truth.sql` (pricing updates)
   - `20250616002520_pink_cottage.sql` (export tracking)
   - `20250616003152_bitter_mouse.sql` (Pro tier updates)
   - `20250616012605_lucky_sky.sql` (Premium tier updates)
   - **NEW**: `20250617015502_snowy_palace.sql` (security audit system)

### Development Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## Testing

### **NEW**: Security Testing Strategy
- Component testing with React Testing Library
- **NEW**: Subscription validation testing
- **NEW**: Security event logging testing
- Integration testing for user flows with security
- Database testing with Supabase local development
- API testing with mock services
- **NEW**: Security audit log verification

### Test Structure
```
src/
├── __tests__/
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   ├── security/          # NEW: Security testing
│   └── integration/
```

### **NEW**: Security Test Cases
- Subscription tier validation
- Tone control access restrictions
- Credit limit enforcement
- Export limit validation
- Security event logging
- Rate limiting functionality

## Performance Considerations

### **NEW**: Security-Aware Optimization Strategies
- **Code Splitting**: Dynamic imports for large components
- **Lazy Loading**: Defer non-critical component loading
- **Memoization**: React.memo for expensive components (with security context)
- **Database Indexing**: Optimized queries with proper indexes (including security logs)
- **NEW**: Subscription validation caching
- **NEW**: Security event batching for performance

### Performance Monitoring with Security
- Bundle size analysis
- Core Web Vitals tracking
- Database query performance (including audit queries)
- API response times (with priority processing)
- **NEW**: Security event processing performance

### **NEW**: Security-Aware Caching Strategy
- Browser caching for static assets
- Service worker for offline functionality
- Database query caching (with security context)
- API response caching (subscription-aware)
- **NEW**: Subscription validation result caching

## Security

### **NEW**: Enhanced Security Measures
- **Row Level Security**: Database-level access control
- **Input Validation**: Client and server-side validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Prevention**: Content sanitization
- **CSRF Protection**: Token-based protection
- **NEW**: Comprehensive audit logging
- **NEW**: Subscription-based access control
- **NEW**: Rate limiting and abuse prevention
- **NEW**: Security event monitoring

### **NEW**: Data Protection with Audit Trails
- **Encryption**: Data encrypted at rest and in transit
- **Access Control**: Role-based permissions with logging
- **Audit Logging**: User action tracking with security events
- **Data Retention**: Configurable retention policies
- **NEW**: Security incident detection
- **NEW**: Subscription bypass prevention

### **NEW**: API Security with Subscription Validation
- **Rate Limiting**: Prevent API abuse (with logging)
- **Authentication**: JWT-based auth (with security events)
- **Authorization**: Role-based access (with subscription validation)
- **Input Sanitization**: Prevent injection attacks
- **NEW**: Subscription tier enforcement
- **NEW**: Security event correlation

### **NEW**: Subscription Security Model
```typescript
// Security validation flow
1. User attempts action
2. Validate subscription tier
3. Log security event
4. Allow/deny with audit trail
5. Monitor for bypass attempts
6. Rate limit suspicious activity
```

## Troubleshooting

### **NEW**: Security-Related Issues

#### Subscription Access Problems
```typescript
// Check subscription validation
const limits = getSubscriptionLimits(user);
console.log('User limits:', limits);

// Verify security events
const events = await supabase
  .from('security_audit_log')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .limit(10);
```

#### Tone Control Access Issues
```typescript
// Debug tone control access
try {
  validateToneAccess(user, 'modify_tone');
  console.log('Tone access granted');
} catch (error) {
  console.log('Tone access denied:', error.message);
}

// Check security audit logs
const toneEvents = await supabase
  .from('security_audit_log')
  .select('*')
  .eq('resource', 'tone_controls')
  .eq('user_id', user.id);
```

### Common Issues

#### Authentication Problems
```typescript
// Check Supabase configuration
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY);

// Verify user session with security context
const { data: { session } } = await supabase.auth.getSession();
console.log('Current session:', session);

// Check security events for auth issues
const authEvents = await supabase
  .from('security_audit_log')
  .select('*')
  .eq('resource', 'authentication')
  .eq('allowed', false);
```

#### Database Connection Issues
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'users';

-- Verify user permissions
SELECT auth.uid(), auth.role();

-- Check security audit log access
SELECT * FROM security_audit_log WHERE user_id = auth.uid() LIMIT 5;
```

#### **NEW**: Credit System Issues with Security
```typescript
// Debug credit calculations with security context
console.log('User credits:', user.credits_remaining);
console.log('Daily used:', user.daily_credits_used);
console.log('Monthly used:', user.monthly_credits_used);
console.log('Last reset:', user.last_credit_reset);

// Check credit-related security events
const creditEvents = await supabase
  .from('security_audit_log')
  .select('*')
  .eq('resource', 'credits')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });
```

#### **NEW**: API Integration Issues with Security
```typescript
// Test Claude API connection with subscription context
const testSecureClaudeAPI = async () => {
  try {
    const analysisLevel = getAnalysisLevel(user);
    const processingPriority = getProcessingPriority(user);
    
    console.log('Analysis level:', analysisLevel);
    console.log('Processing priority:', processingPriority);
    
    const response = await rewriteWithClaude(
      'test text', 
      samples, 
      toneSettings, 
      apiKey, 
      analysisLevel, 
      processingPriority
    );
    console.log('Secure API test successful');
  } catch (error) {
    console.error('Secure API test failed:', error);
  }
};
```

### **NEW**: Debug Mode with Security
Enable debug logging by setting:
```bash
VITE_DEBUG=true
```

### **NEW**: Security Monitoring
- Real-time security event tracking
- Subscription bypass attempt detection
- Rate limiting violation monitoring
- Audit log analysis tools

## Contributing

### Development Workflow
1. Create feature branch
2. Implement changes with security considerations
3. Add tests (including security tests)
4. Update documentation
5. **NEW**: Verify security audit logging
6. Submit pull request

### **NEW**: Security Code Standards
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Conventional commits
- **NEW**: Security validation for all subscription-gated features
- **NEW**: Comprehensive audit logging for user actions
- **NEW**: Input validation and sanitization

### **NEW**: Security Review Process
- Code review required (including security review)
- Test coverage maintained (including security tests)
- Documentation updated (including security implications)
- Performance impact assessed (including security overhead)
- **NEW**: Security audit log verification
- **NEW**: Subscription validation testing

---

## Appendix

### **NEW**: Security Event Types
- `user_sign_in` / `user_sign_out` / `sign_in_failed` / `sign_up_failed`
- `credit_usage_attempt` / `credit_limit_exceeded` / `credits_used`
- `export_attempt` / `export_limit_exceeded` / `export_successful`
- `tone_control_access` / `subscription_bypass_attempt`
- `rate_limit_violation`

### Database Migration History
- **v1**: Initial schema (users, writing_samples, rewrite_history)
- **v2**: Credit system implementation
- **v3**: Export tracking
- **v4**: Subscription tier updates
- **v5**: Premium tier features
- **NEW v6**: Security audit system and subscription validation

### **NEW**: Security Architecture
- **Frontend**: Subscription validation + security error handling
- **Backend**: Database functions + audit logging + RLS policies
- **API**: Secure Claude integration + subscription-aware processing

### API Endpoints
- **Supabase**: Database operations, authentication, security logging
- **Claude API**: Text rewriting service (subscription-aware)
- **Netlify**: Deployment and hosting

### External Dependencies
- **@supabase/supabase-js**: Database client
- **lucide-react**: Icon library
- **tailwindcss**: Styling framework
- **react**: UI framework
- **typescript**: Type safety

### **NEW**: Security Dependencies
- Custom subscription validation system
- Security audit logging framework
- Rate limiting implementation
- Access control matrix

### Performance Benchmarks
- **Initial Load**: < 2s
- **Text Rewrite**: < 5s (standard), < 2.5s (priority), < 1.7s (premium)
- **Database Query**: < 500ms
- **Bundle Size**: < 1MB
- **NEW**: Security Event Logging: < 100ms overhead

### **NEW**: Security Metrics
- **Subscription Validation**: < 50ms
- **Audit Log Write**: < 100ms
- **Rate Limit Check**: < 10ms
- **Access Control Validation**: < 25ms

This documentation provides a comprehensive overview of the TweakMyText application architecture, implementation details, security features, and operational procedures for developers working on the project.