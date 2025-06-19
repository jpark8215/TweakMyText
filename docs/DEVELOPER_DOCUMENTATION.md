# TweakMyText Developer Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Authentication & Authorization](#authentication--authorization)
5. [Subscription System](#subscription-system)
6. [Token System](#token-system)
7. [Tone Control System](#tone-control-system)
8. [Security & Audit System](#security--audit-system)
9. [API Integration](#api-integration)
10. [Component Structure](#component-structure)
11. [State Management](#state-management)
12. [Responsive Design](#responsive-design)
13. [Deployment](#deployment)
14. [Development Setup](#development-setup)
15. [Testing](#testing)
16. [Performance Considerations](#performance-considerations)
17. [Security](#security)
18. [Troubleshooting](#troubleshooting)

## Project Overview

TweakMyText is an AI-powered writing style rewriter application that analyzes user writing samples to learn their unique voice and tone, then transforms any input text to match that style. The application features a comprehensive freemium subscription model with three tiers: Free, Pro, and Premium.

### Key Features
- **Writing Style Analysis**: AI-powered analysis of user writing samples with subscription-based analysis levels
- **Text Rewriting**: Transform any text to match learned writing style with priority processing
- **Advanced Tone Controls**: 10 fine-tuning controls with subscription-gated access
- **Subscription Tiers**: Free, Pro, and Premium with different feature sets and security controls
- **Token System**: Usage-based billing with daily/monthly limits and comprehensive tracking
- **Export Functionality**: Export results in multiple formats with subscription-based limits
- **Rewrite History**: Track and access previous rewrites with security audit trails
- **Security Audit System**: Comprehensive logging and monitoring of user actions and subscription access
- **Responsive Design**: Fully responsive interface optimized for mobile, tablet, and desktop
- **Session Management**: Proper sign-out handling with state cleanup

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with responsive design system
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with security logging
- **AI Integration**: Claude API (with fallback mock implementation)
- **Deployment**: Netlify (Production: https://tweakmytext.netlify.app)
- **Security**: Row Level Security (RLS) + Comprehensive Audit Logging

## Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │────│   Supabase      │────│   Claude API    │
│   (Frontend)    │    │   (Backend)     │    │   (AI Service)  │
│   + Responsive  │    │   + Security    │    │                 │
│   + Session Mgmt│    │   + Audit Log   │    │                 │
│   + Tone System │    │   + Billing     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Hierarchy
```
App
├── AuthModal
├── SettingsModal (with testing upgrade features)
├── PricingModal (updated with tone control features)
├── UserMenu
├── StyleCapture (Responsive)
│   └── WritingSample Management (with subscription limits)
├── TextRewriter (Responsive)
│   ├── ToneControls (10 controls with subscription gating)
│   └── ComparisonView (responsive)
├── SubscriptionManagement (real billing data only)
├── Security Layer (validation & logging)
└── Session Management (sign-out handling)
```

### Data Flow with Security & Session Management
1. User authenticates via Supabase Auth (logged)
2. Session state managed with proper cleanup on sign-out
3. Writing samples stored in `writing_samples` table (with subscription limits)
4. Style analysis performed on samples (subscription-level dependent)
5. Text rewriting via Claude API or mock service (with priority processing)
6. Results stored in `rewrite_history` table (with audit trail)
7. Token tracking in `users` table (with security validation)
8. All actions logged in `security_audit_log` table
9. Proper state cleanup and redirect on sign-out

## Database Schema

### Tables Overview

#### `users` Table
Primary user information and subscription details with token-based system.

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
Historical record of all text rewrites (simplified token system).

```sql
CREATE TABLE rewrite_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_text text NOT NULL,
  rewritten_text text NOT NULL,
  confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  style_tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
```

**Note**: The `credits_used` column has been removed as tokens are now tracked at the user level only.

#### `security_audit_log` Table
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

#### `billing_history` Table
Billing and payment tracking (real data only, no sample data).

```sql
CREATE TABLE billing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  currency text DEFAULT 'USD' NOT NULL,
  status text NOT NULL CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
  description text NOT NULL,
  subscription_tier text NOT NULL CHECK (subscription_tier IN ('free', 'pro', 'premium')),
  stripe_payment_id text,
  created_at timestamptz DEFAULT now()
);
```

### Row Level Security (RLS)
All tables have RLS enabled with policies ensuring users can only access their own data:
- `auth.uid() = user_id` for data access
- `auth.uid() = id` for user profile access
- Security audit logs are write-only for users, read-only for future admin roles

### Database Functions

#### `reset_daily_tokens()`
Resets daily tokens for free tier users at midnight UTC.

#### `reset_monthly_tokens()`
Resets monthly tokens and exports on user's signup anniversary.

#### `log_security_event()` 
Logs security events and access attempts to the audit table.

#### `validate_subscription_access()` 
Validates user subscription tier against required access level and logs attempts.

#### `check_tone_control_access()` 
Specifically validates tone control access and logs security events.

#### `handle_new_user()`
Automatically creates user profile when new auth user is created.

## Authentication & Authorization

### Supabase Auth Integration with Session Management
- Email/password authentication
- No email confirmation required
- Automatic user profile creation on signup via trigger
- JWT-based session management
- **Enhanced**: Comprehensive security event logging for all auth actions
- **Enhanced**: Proper session cleanup on sign-out
- **Enhanced**: State management with sign-out detection
- **Enhanced**: Session refresh functionality for password updates

### User Profile Management
```typescript
interface User {
  id: string;
  email: string;
  subscription_tier: 'free' | 'pro' | 'premium';
  tokens_remaining: number;
  daily_tokens_used: number;
  monthly_tokens_used: number;
  monthly_exports_used: number;
  last_token_reset: string;
  monthly_reset_date: number;
  subscription_expires_at?: Date;
  created_at: Date;
}
```

### Authentication Hook with Security Logging & Session Management
The `useAuth` hook provides:
- User state management with proper cleanup
- Sign in/up/out functions (with security logging and state cleanup)
- Token management (with audit trails)
- Export tracking (with access validation)
- **Enhanced**: Automatic security event logging for all user actions
- **Enhanced**: Proper session state cleanup on sign-out
- **Enhanced**: Sign-out state detection and UI updates
- **Enhanced**: Session refresh and error handling

## Subscription System

### Tier Comparison

| Feature | Free | Pro | Premium |
|---------|------|-----|---------|
| Monthly Tokens | 1,000,000 | 5,000,000 | 10,000,000 |
| Daily Token Limit | 100,000 | No limit | No limit |
| Writing Samples | 3 | 25 | 100 |
| Monthly Exports | 5 | 200 | Unlimited |
| Processing Speed | 1x | 2x | 3x |
| Style Analysis | Basic | Advanced | Extended |
| **Tone Controls** | **View-Only (Auto-detected)** | **6 Controls + Presets** | **All 10 Controls + Custom Fine-Tuning** |
| History Access | No | Yes | Yes |
| Pricing | Free | $10/month | $18/month |

### **Enhanced**: Subscription Security & Validation

#### Subscription Limits Implementation
```typescript
interface SubscriptionLimits {
  canModifyTone: boolean;           // Tone modification access
  canUsePresets: boolean;           // Basic preset access
  canUseAdvancedPresets: boolean;   // Advanced preset access
  hasAdvancedAnalysis: boolean;
  hasExtendedAnalysis: boolean;
  hasPriorityProcessing: boolean;
  processingPriority: 'standard' | 'priority' | 'premium';
  maxWritingSamples: number;
  dailyLimit: number;
  monthlyLimit: number;
  exportLimit: number;
  availableToneControls: string[];  // NEW: Which tone controls are available
  maxToneControls: number;          // NEW: Maximum number of tone controls
}
```

#### **NEW**: Tone Control Access Matrix
- **Free Tier**: View-only tone controls (auto-detected from samples) - 0 modifiable controls
- **Pro Tier**: 6 tone controls + basic presets (formality, casual, enthusiasm, technical, creativity, empathy)
- **Premium Tier**: All 10 tone controls + advanced presets + custom fine-tuning (adds confidence, humor, urgency, clarity)

#### Security Validation Functions
```typescript
// Validate tone control access
validateToneAccess(user: User | null, action: string): void

// Validate preset usage
validatePresetAccess(user: User | null, presetName: string): void

// Validate tone settings modifications
validateToneSettings(user: User | null, toneSettings: ToneSettings): void

// NEW: Check available tone controls for user's tier
getSubscriptionLimits(user: User | null): SubscriptionLimits
```

## Token System

### **Enhanced**: Token-Based Usage System

The application uses a comprehensive token-based system for granular usage tracking and better user experience.

#### Token Allocation by Tier
- **Free Tier**: 100,000 tokens/day, 1,000,000/month max (with daily limit enforcement)
- **Pro Tier**: 5,000,000 tokens/month, no daily limit (with security validation)
- **Premium Tier**: 10,000,000 tokens/month, no daily limit (with audit logging)

#### Token Estimation
- **Calculation**: Approximately 4 characters per token
- **Real-time Display**: Users see estimated token usage before processing
- **Accurate Tracking**: Actual usage tracked and deducted after processing

### **Enhanced**: Security-Enhanced Token Tracking
```typescript
const updateTokens = async (tokensUsed: number) => {
  // 1. Log token usage attempt
  await logSecurityEvent({
    userId: user.id,
    action: 'token_usage_attempt',
    resource: 'tokens',
    allowed: true,
    subscriptionTier: user.subscription_tier,
  });

  // 2. Validate subscription limits
  // 3. Check daily/monthly limits with security logging
  // 4. Update tokens with audit trail
  // 5. Log successful usage or limit violations
};
```

### Token Usage Estimation
The system estimates token usage based on text length (approximately 4 characters per token), providing users with real-time feedback on their usage before processing.

### Reset Logic with Audit Trails
- **Daily Reset**: Midnight UTC for free users only (logged)
- **Monthly Reset**: On signup anniversary day (logged)
- **Automatic Resets**: Handled by database functions with security events

### Token Formatting
The application uses intelligent token formatting for better user experience:
- 1,000+ tokens displayed as "1K"
- 1,000,000+ tokens displayed as "1M"
- Real-time usage tracking with remaining token display

### **Enhanced**: Database Schema Changes
- **Removed**: `credits_used` column from `rewrite_history` table
- **Added**: Comprehensive token tracking in `users` table
- **Simplified**: Token deduction happens at user level only
- **Improved**: Cleaner database schema with better performance

## Tone Control System

### **NEW**: Advanced Tone Control System

The application features a sophisticated 10-control tone system with subscription-based access restrictions.

#### Tone Control Structure
```typescript
interface ToneSettings {
  // Pro Tier Controls (6 controls)
  formality: number;     // 0-100: Casual ↔ Formal
  casualness: number;    // 0-100: Reserved ↔ Friendly
  enthusiasm: number;    // 0-100: Calm ↔ Energetic
  technicality: number;  // 0-100: Simple ↔ Technical
  creativity: number;    // 0-100: Conservative ↔ Creative
  empathy: number;       // 0-100: Neutral ↔ Empathetic
  
  // Premium Tier Controls (4 additional controls)
  confidence: number;    // 0-100: Humble ↔ Confident
  humor: number;         // 0-100: Serious ↔ Playful
  urgency: number;       // 0-100: Relaxed ↔ Urgent
  clarity: number;       // 0-100: Complex ↔ Clear
}
```

#### Subscription-Based Access Control

##### **Free Tier (View-Only)**
- **Access**: View-only, auto-detected tone settings
- **Controls**: 0 modifiable controls
- **Features**: Automatic tone detection from writing samples
- **Restrictions**: Cannot modify any tone settings

##### **Pro Tier (6 Controls + Presets)**
- **Access**: 6 core tone controls + basic presets
- **Controls**: formality, casualness, enthusiasm, technicality, creativity, empathy
- **Features**: Manual tone adjustment + 4 basic presets
- **Presets**: Professional, Friendly, Academic, Casual

##### **Premium Tier (All 10 Controls + Advanced Features)**
- **Access**: All 10 tone controls + advanced presets + custom fine-tuning
- **Controls**: All Pro controls + confidence, humor, urgency, clarity
- **Features**: Custom fine-tuning + 4 advanced presets
- **Advanced Presets**: Executive, Creative, Technical, Persuasive

#### Tone Control Security Implementation
```typescript
// Validate tone control access
const validateToneAccess = (user: User | null, action: string): void => {
  const limits = getSubscriptionLimits(user);
  
  switch (action) {
    case 'modify_tone':
      if (!limits.canModifyTone) {
        throw new Error('Tone customization requires Pro or Premium subscription');
      }
      break;
    case 'use_presets':
      if (!limits.canUsePresets) {
        throw new Error('Tone presets require Pro or Premium subscription');
      }
      break;
    case 'use_advanced_presets':
      if (!limits.canUseAdvancedPresets) {
        throw new Error('Advanced tone presets require Premium subscription');
      }
      break;
  }
};

// Validate specific tone control availability
const validateToneSettings = (user: User | null, toneSettings: ToneSettings): void => {
  const limits = getSubscriptionLimits(user);
  
  // Check if user is trying to use unavailable controls
  const unavailableControls = Object.keys(toneSettings).filter(
    control => !limits.availableToneControls.includes(control)
  );
  
  if (unavailableControls.length > 0) {
    const tierName = user?.subscription_tier === 'pro' ? 'Premium' : 'Pro or Premium';
    throw new Error(`The following tone controls require ${tierName} subscription: ${unavailableControls.join(', ')}`);
  }
};
```

#### Tone Analysis with Subscription Levels
```typescript
// Secure tone analysis with subscription validation
export const analyzeToneFromSamples = (samples: WritingSample[], user: User | null): ToneSettings => {
  const limits = getSubscriptionLimits(user);
  const analysisLevel = getAnalysisLevel(user);
  
  // Basic analysis for all users (auto-detection)
  let toneSettings = performBasicAnalysis(samples);
  
  // Advanced analysis for Pro/Premium users
  if (analysisLevel === 'advanced' || analysisLevel === 'extended') {
    toneSettings = enhanceWithAdvancedAnalysis(toneSettings, samples);
  }
  
  // Extended analysis for Premium users only
  if (analysisLevel === 'extended') {
    toneSettings = enhanceWithExtendedAnalysis(toneSettings, samples);
  }
  
  return toneSettings;
};
```

## Security & Audit System

### **Enhanced**: Comprehensive Security Logging

#### Security Event Types
- Authentication events (sign in/out, failures)
- Token usage and limit violations
- Export attempts and restrictions
- **NEW**: Tone control access attempts and violations
- **NEW**: Subscription bypass attempts for tone controls
- **NEW**: Preset usage attempts
- Rate limiting violations
- Session management events

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

#### **NEW**: Tone Control Security Events
- `tone_control_access` - User attempts to modify tone controls
- `preset_access_attempt` - User attempts to use presets
- `advanced_preset_blocked` - Pro user attempts Premium presets
- `tone_modification_blocked` - Free user attempts tone modification
- `subscription_bypass_attempt` - User attempts to bypass subscription restrictions

#### Rate Limiting
- Built-in rate limiting for security-sensitive actions
- Automatic logging of rate limit violations
- Configurable limits per action type

#### **NEW**: Access Control Matrix
```typescript
// Tone Control Actions
'modify_tone'          -> Requires Pro/Premium
'use_presets'          -> Requires Pro/Premium  
'use_advanced_presets' -> Requires Premium
'advanced_analysis'    -> Requires Pro/Premium
'extended_analysis'    -> Requires Premium
'priority_processing'  -> Requires Pro/Premium

// Tone Control Specific
'formality'            -> Pro/Premium
'casualness'           -> Pro/Premium
'enthusiasm'           -> Pro/Premium
'technicality'         -> Pro/Premium
'creativity'           -> Pro/Premium
'empathy'              -> Pro/Premium
'confidence'           -> Premium Only
'humor'                -> Premium Only
'urgency'              -> Premium Only
'clarity'              -> Premium Only
```

## API Integration

### **Enhanced**: Secure Claude API Integration
Enhanced Claude API integration with subscription-based features and tone control support.

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
- **Basic**: Free tier - fundamental style analysis (no tone modification)
- **Advanced**: Pro tier - detailed pattern analysis + 6 tone controls
- **Extended**: Premium tier - comprehensive linguistic analysis + all 10 tone controls

#### Processing Priority
- **Standard (3)**: Free tier - standard processing speed
- **Priority (2)**: Pro tier - 2x faster processing
- **Premium (1)**: Premium tier - 3x faster processing + best model configuration

#### **NEW**: Tone Control Integration
```typescript
const generateToneInstructions = (settings: ToneSettings, analysisLevel: string): string => {
  const instructions: string[] = [];

  // Basic tone instructions for all levels
  if (settings.formality > 60) {
    instructions.push(`- Use formal language and professional tone (${settings.formality}% formal)`);
  }

  // Advanced tone instructions for Pro/Premium
  if (analysisLevel === 'advanced' || analysisLevel === 'extended') {
    if (settings.creativity > 60) {
      instructions.push(`- Use creative and innovative language (${settings.creativity}% creative)`);
    }
    if (settings.empathy > 60) {
      instructions.push(`- Show understanding and empathy (${settings.empathy}% empathetic)`);
    }
  }

  // Extended tone instructions for Premium only
  if (analysisLevel === 'extended') {
    if (settings.confidence > 60) {
      instructions.push(`- Use confident and assertive language (${settings.confidence}% confident)`);
    }
    if (settings.humor > 60) {
      instructions.push(`- Include appropriate humor and playfulness (${settings.humor}% humorous)`);
    }
    if (settings.urgency > 60) {
      instructions.push(`- Convey urgency and time-sensitivity (${settings.urgency}% urgent)`);
    }
    if (settings.clarity > 60) {
      instructions.push(`- Prioritize clarity and straightforward communication (${settings.clarity}% clear)`);
    }
  }

  return instructions.length > 0 ? instructions.join('\n') : '- Maintain a balanced, natural tone';
};
```

### **Enhanced**: Secure Mock Implementation
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

### **Enhanced**: Security-Enhanced Core Components

#### `App.tsx`
**Major Enhancement**: Session management and sign-out handling:
- **Enhanced**: Sign-out detection with automatic state cleanup
- **Enhanced**: Redirect to sign-in page when accessing protected views while signed out
- **Enhanced**: Proper state reset on sign-out (samples, view, modals)
- **Enhanced**: Responsive design improvements

#### `TextRewriter.tsx`
**Major Enhancement**: Fully responsive text rewriting interface with token system:
- **Enhanced**: Mobile-first responsive design
- **Enhanced**: Token usage estimation and display
- **Enhanced**: Real-time token consumption tracking
- **Enhanced**: Adaptive button layouts and text sizing
- **Enhanced**: Touch-friendly controls for mobile devices
- **Enhanced**: Subscription validation before rewriting
- **Enhanced**: Security error handling and display
- **Enhanced**: Secure tone settings management
- **Enhanced**: Audit trail for all rewrite operations

#### **NEW**: `ToneControls.tsx`
**Major Enhancement**: Advanced tone control interface with subscription gating:
- **Enhanced**: 10 comprehensive tone controls with subscription-based access
- **Enhanced**: Mobile-optimized slider controls with touch-friendly interaction
- **Enhanced**: Responsive preset grids (basic + advanced)
- **Free Tier**: View-only controls with clear upgrade prompts
- **Pro Tier**: 6 controls + basic presets (Professional, Friendly, Academic, Casual)
- **Premium Tier**: All 10 controls + advanced presets (Executive, Creative, Technical, Persuasive)
- **Enhanced**: Real-time subscription validation with security logging
- **Enhanced**: Visual indicators for locked/available controls
- **Enhanced**: Responsive design with adaptive layouts

#### `StyleCapture.tsx`
**Major Enhancement**: Responsive writing sample management:
- **Enhanced**: Mobile-first design with proper spacing
- **Enhanced**: Responsive typography and icon sizing
- **Enhanced**: Touch-friendly sample management
- **Enhanced**: Adaptive form layouts
- **Enhanced**: Subscription limit warnings with responsive design

#### `ComparisonView.tsx`
**Major Enhancement**: Responsive comparison interface:
- **Enhanced**: Mobile-optimized comparison layout
- **Enhanced**: Responsive arrow indicators (rotated on mobile)
- **Enhanced**: Adaptive text sizing and spacing
- **Enhanced**: Touch-friendly interaction areas

#### `UserMenu.tsx`
**Enhanced**: Token display with formatting:
- **Enhanced**: Intelligent token formatting (1K, 1M)
- **Enhanced**: Real-time token remaining display
- **Enhanced**: Responsive design for all screen sizes

#### **NEW**: `PricingModal.tsx`
**Enhanced**: Updated pricing with tone control features:
- **Enhanced**: Tone control feature highlighting
- **Enhanced**: Clear differentiation between tier capabilities
- **Enhanced**: Updated feature descriptions:
  - Free: "View-only tone controls (auto-detected)"
  - Pro: "6 core tone controls + presets"
  - Premium: "All 10 tone controls + custom fine-tuning"
- **Enhanced**: Feature comparison section with tone control details

#### **NEW**: `SettingsModal.tsx`
**Enhanced**: Settings with testing upgrade functionality:
- **Enhanced**: Testing mode upgrade buttons for Pro/Premium
- **Enhanced**: Improved password update with session refresh
- **Enhanced**: Better error handling and user feedback
- **Enhanced**: Subscription tier display with visual indicators

#### `SubscriptionManagement.tsx`
**Enhanced**: Real billing data integration:
- **Enhanced**: Removed all sample/mock billing data
- **Enhanced**: Real database integration only
- **Enhanced**: Token usage statistics and progress bars
- **Enhanced**: Token formatting and display
- **Enhanced**: Responsive design for all screen sizes

#### **Enhanced**: Security Validation Layer
- `subscriptionValidator.ts`: Enhanced with tone control validation
- `securityLogger.ts`: Comprehensive security event logging
- `secureStyleAnalyzer.ts`: Subscription-aware style analysis with tone controls

### Modal Components

#### `AuthModal.tsx`
Authentication interface with security logging:
- Sign in/up forms with failure logging
- Error handling with security events
- Welcome messaging

## State Management

### **Enhanced**: Security-Aware State Management with Session Handling
- Component-level state using `useState`
- **Enhanced**: Security error state management
- **Enhanced**: Subscription validation state
- **Enhanced**: Session state management with sign-out detection
- **Enhanced**: Automatic state cleanup on sign-out
- **Enhanced**: Token usage state management
- **NEW**: Tone control state management with subscription validation
- Form state management with validation
- UI state (modals, loading, errors, security alerts)

### Global State with Security & Session Management
- User authentication via `useAuth` hook (with security logging and session management)
- Writing samples passed between components (with subscription limits)
- **Enhanced**: Subscription limits computed with security validation
- **Enhanced**: Security event tracking
- **Enhanced**: Session state cleanup on sign-out
- **Enhanced**: Token usage tracking and display
- **NEW**: Tone control state with subscription-based restrictions

### Data Persistence with Audit Trails
- Writing samples: Supabase database (with access logging)
- User preferences: Local storage
- Session state: Supabase Auth (with security events and cleanup)
- **Enhanced**: Security audit logs: Permanent database storage
- **Enhanced**: Billing history: Real Supabase integration (no sample data)
- **Enhanced**: Token usage: Real-time tracking
- **NEW**: Tone control preferences: Subscription-validated storage

## Responsive Design

### **Enhanced**: Comprehensive Responsive Design System

#### Design Principles
- **Mobile-First**: All components designed for mobile, then enhanced for larger screens
- **Touch-Friendly**: Minimum 44px touch targets for all interactive elements
- **Readable Typography**: Proper font scaling across all screen sizes
- **Adaptive Layouts**: Flexible layouts that work on any screen size
- **Consistent Spacing**: 8px spacing system with responsive scaling

#### Breakpoint Strategy
```css
/* Mobile (default) */
/* Tablet (sm: 640px+) */
/* Desktop (lg: 1024px+) */
/* Large Desktop (xl: 1280px+) */
```

#### Component Responsiveness

##### **StyleCapture Component**
- **Mobile**: Single-column layout, compact spacing, touch-friendly buttons
- **Tablet**: Enhanced spacing, larger touch targets
- **Desktop**: Optimized layouts with better use of screen space

##### **TextRewriter Component**
- **Mobile**: Stacked header layout, compact controls, hidden text on small buttons
- **Tablet**: Balanced two-column layouts where appropriate
- **Desktop**: Full multi-column layouts with enhanced spacing
- **Enhanced**: Token usage display adapts to screen size

##### **NEW**: **ToneControls Component**
- **Mobile**: Stacked control layout, touch-optimized sliders, compact preset grids
- **Tablet**: Balanced grid layouts with proper spacing
- **Desktop**: Full grid layouts with optimal spacing and visual hierarchy
- **Enhanced**: Responsive locked/available control indicators
- **Enhanced**: Adaptive preset button sizing

##### **ComparisonView Component**
- **Mobile**: Vertical layout with rotated arrow indicator
- **Tablet**: Side-by-side with proper spacing
- **Desktop**: Enhanced comparison with larger content areas

#### Typography Scaling
```css
/* Responsive font sizes */
text-xs sm:text-sm lg:text-base     /* Body text */
text-sm sm:text-base lg:text-lg     /* Subheadings */
text-xl sm:text-2xl lg:text-3xl     /* Main headings */
```

#### Icon Scaling
```css
/* Responsive icon sizes */
w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5   /* Small icons */
w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 /* Large icons */
```

#### Spacing System
```css
/* Responsive spacing */
p-3 sm:p-4 lg:p-6                   /* Padding */
gap-2 sm:gap-3 lg:gap-4             /* Gaps */
mb-4 sm:mb-6 lg:mb-8                /* Margins */
```

## Deployment

### **Enhanced**: Production Deployment Information
- **Primary Platform**: Netlify
- **Live URL**: https://tweakmytext.netlify.app
- **Build Process**: Automated via Netlify
- **Environment**: Production-ready with security features, responsive design, and tone controls

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

### **Enhanced**: Security Considerations for Production
- Environment variables properly configured
- Security audit logging enabled
- Rate limiting active
- Subscription validation enforced
- All security policies enabled
- Responsive design optimized for all devices
- Token system fully operational
- **NEW**: Tone control access restrictions enforced

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

### **Enhanced**: Database Setup with Security, Token System, and Tone Controls
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
   - `20250617015502_snowy_palace.sql` (security audit system)
   - `20250618005630_heavy_disk.sql` (billing history)
   - `20250618020049_crimson_spark.sql` (token system migration)
   - `20250618021548_bold_island.sql` (remove credits_used column)
   - `20250619013507_bright_sound.sql` (auth fixes and user profile creation)

### Development Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### **NEW**: Testing Subscription Tiers
The application includes testing functionality to upgrade accounts:
1. Sign in as a free user
2. Go to Settings modal
3. Use "Upgrade to Pro" or "Upgrade to Premium" buttons
4. Test tone control access for different tiers

## Testing

### **Enhanced**: Security Testing Strategy
- Component testing with React Testing Library
- **Enhanced**: Subscription validation testing
- **Enhanced**: Security event logging testing
- **Enhanced**: Responsive design testing
- **Enhanced**: Session management testing
- **Enhanced**: Token system testing
- **NEW**: Tone control access testing
- **NEW**: Preset usage validation testing
- Integration testing for user flows with security
- Database testing with Supabase local development
- API testing with mock services
- **Enhanced**: Security audit log verification

### Test Structure
```
src/
├── __tests__/
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   ├── security/          # Security testing
│   ├── responsive/        # Responsive design testing
│   ├── tokens/            # Token system testing
│   ├── toneControls/      # NEW: Tone control testing
│   └── integration/
```

### **Enhanced**: Security Test Cases
- Subscription tier validation
- **NEW**: Tone control access restrictions
- **NEW**: Preset usage validation
- Token limit enforcement
- Export limit validation
- Security event logging
- Rate limiting functionality
- Session management and cleanup

### **NEW**: Tone Control Test Cases
- Free tier view-only access
- Pro tier 6-control access
- Premium tier 10-control access
- Preset access validation
- Advanced preset restrictions
- Tone setting validation
- Security event logging for tone access

### **Enhanced**: Token System Test Cases
- Token usage estimation accuracy
- Daily/monthly limit enforcement
- Token reset functionality
- Token formatting display
- Usage tracking accuracy

### **Enhanced**: Responsive Design Test Cases
- Mobile layout validation
- Touch target size verification
- Typography scaling tests
- Breakpoint behavior validation
- Cross-device compatibility
- **NEW**: Tone control responsive behavior

## Performance Considerations

### **Enhanced**: Security-Aware Optimization Strategies
- **Code Splitting**: Dynamic imports for large components
- **Lazy Loading**: Defer non-critical component loading
- **Memoization**: React.memo for expensive components (with security context)
- **Database Indexing**: Optimized queries with proper indexes (including security logs)
- **Enhanced**: Subscription validation caching
- **Enhanced**: Security event batching for performance
- **Enhanced**: Responsive image optimization
- **Enhanced**: Token calculation optimization
- **NEW**: Tone control state optimization

### Performance Monitoring with Security
- Bundle size analysis
- Core Web Vitals tracking
- Database query performance (including audit queries)
- API response times (with priority processing)
- **Enhanced**: Security event processing performance
- **Enhanced**: Responsive design performance metrics
- **Enhanced**: Token calculation performance
- **NEW**: Tone control rendering performance

### **Enhanced**: Security-Aware Caching Strategy
- Browser caching for static assets
- Service worker for offline functionality
- Database query caching (with security context)
- API response caching (subscription-aware)
- **Enhanced**: Subscription validation result caching
- **Enhanced**: Responsive asset caching
- **Enhanced**: Token usage calculation caching
- **NEW**: Tone control state caching

## Security

### **Enhanced**: Enhanced Security Measures
- **Row Level Security**: Database-level access control
- **Input Validation**: Client and server-side validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Prevention**: Content sanitization
- **CSRF Protection**: Token-based protection
- **Enhanced**: Comprehensive audit logging
- **Enhanced**: Subscription-based access control
- **Enhanced**: Rate limiting and abuse prevention
- **Enhanced**: Security event monitoring
- **Enhanced**: Session security with proper cleanup
- **Enhanced**: Token usage validation and limits
- **NEW**: Tone control access restrictions and validation

### **Enhanced**: Data Protection with Audit Trails
- **Encryption**: Data encrypted at rest and in transit
- **Access Control**: Role-based permissions with logging
- **Audit Logging**: User action tracking with security events
- **Data Retention**: Configurable retention policies
- **Enhanced**: Security incident detection
- **Enhanced**: Subscription bypass prevention
- **Enhanced**: Session data protection
- **Enhanced**: Token usage audit trails
- **NEW**: Tone control access audit trails

### **Enhanced**: API Security with Subscription Validation
- **Rate Limiting**: Prevent API abuse (with logging)
- **Authentication**: JWT-based auth (with security events)
- **Authorization**: Role-based access (with subscription validation)
- **Input Sanitization**: Prevent injection attacks
- **Enhanced**: Subscription tier enforcement
- **Enhanced**: Security event correlation
- **Enhanced**: Token usage validation
- **NEW**: Tone control access validation

### **Enhanced**: Subscription Security Model
```typescript
// Security validation flow
1. User attempts action
2. Validate subscription tier
3. Check specific feature access (e.g., tone controls)
4. Validate token availability
5. Log security event
6. Allow/deny with audit trail
7. Monitor for bypass attempts
8. Rate limit suspicious activity
9. Handle session security
```

## Troubleshooting

### **Enhanced**: Security-Related Issues

#### Subscription Access Problems
```typescript
// Check subscription validation
const limits = getSubscriptionLimits(user);
console.log('User limits:', limits);
console.log('Available tone controls:', limits.availableToneControls);

// Verify security events
const events = await supabase
  .from('security_audit_log')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .limit(10);
```

#### **NEW**: Tone Control Access Issues
```typescript
// Debug tone control access
try {
  validateToneAccess(user, 'modify_tone');
  console.log('Tone access granted');
} catch (error) {
  console.log('Tone access denied:', error.message);
}

// Check available controls for user's tier
const limits = getSubscriptionLimits(user);
console.log('Available tone controls:', limits.availableToneControls);
console.log('Max tone controls:', limits.maxToneControls);

// Check tone control security events
const toneEvents = await supabase
  .from('security_audit_log')
  .select('*')
  .eq('resource', 'tone_controls')
  .eq('user_id', user.id);
```

#### **Enhanced**: Token System Issues
```typescript
// Debug token calculations with security context
console.log('User tokens:', user.tokens_remaining);
console.log('Daily used:', user.daily_tokens_used);
console.log('Monthly used:', user.monthly_tokens_used);
console.log('Last reset:', user.last_token_reset);

// Check token-related security events
const tokenEvents = await supabase
  .from('security_audit_log')
  .select('*')
  .eq('resource', 'tokens')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });

// Test token estimation
const testText = "Sample text for estimation";
const estimatedTokens = Math.ceil(testText.length / 4);
console.log('Estimated tokens:', estimatedTokens);
```

#### **Enhanced**: Session Management Issues
```typescript
// Debug session state
const { data: { session } } = await supabase.auth.getSession();
console.log('Current session:', session);

// Check for proper state cleanup
console.log('User state after sign-out:', user);
console.log('Current view after sign-out:', currentView);

// Test session refresh
const { data, error } = await supabase.auth.refreshSession();
console.log('Session refresh result:', { data: !!data, error });
```

#### **Enhanced**: Responsive Design Issues
```css
/* Debug responsive breakpoints */
@media (max-width: 640px) {
  /* Mobile styles */
}

@media (min-width: 640px) and (max-width: 1024px) {
  /* Tablet styles */
}

@media (min-width: 1024px) {
  /* Desktop styles */
}
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

-- Check billing history access (should show real data only)
SELECT * FROM billing_history WHERE user_id = auth.uid() LIMIT 5;

-- Check token system migration
SELECT tokens_remaining, daily_tokens_used, monthly_tokens_used 
FROM users WHERE id = auth.uid();

-- Verify rewrite_history table structure (credits_used should be removed)
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'rewrite_history';

-- Check user profile creation trigger
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
```

#### **Enhanced**: API Integration Issues with Security
```typescript
// Test Claude API connection with subscription context
const testSecureClaudeAPI = async () => {
  try {
    const analysisLevel = getAnalysisLevel(user);
    const processingPriority = getProcessingPriority(user);
    const limits = getSubscriptionLimits(user);
    
    console.log('Analysis level:', analysisLevel);
    console.log('Processing priority:', processingPriority);
    console.log('Available tone controls:', limits.availableToneControls);
    
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

#### **NEW**: Tone Control Issues
```typescript
// Debug tone control state
const debugToneControls = () => {
  const limits = getSubscriptionLimits(user);
  
  console.log('User subscription tier:', user?.subscription_tier);
  console.log('Can modify tone:', limits.canModifyTone);
  console.log('Can use presets:', limits.canUsePresets);
  console.log('Can use advanced presets:', limits.canUseAdvancedPresets);
  console.log('Available controls:', limits.availableToneControls);
  console.log('Max controls:', limits.maxToneControls);
};

// Test tone setting validation
const testToneValidation = (toneSettings: ToneSettings) => {
  try {
    validateToneSettings(user, toneSettings);
    console.log('Tone settings valid');
  } catch (error) {
    console.error('Tone validation failed:', error.message);
  }
};
```

#### **Enhanced**: Responsive Design Issues
```typescript
// Debug responsive behavior
const checkResponsive = () => {
  console.log('Window width:', window.innerWidth);
  console.log('Mobile breakpoint:', window.innerWidth < 640);
  console.log('Tablet breakpoint:', window.innerWidth >= 640 && window.innerWidth < 1024);
  console.log('Desktop breakpoint:', window.innerWidth >= 1024);
};

// Check touch device
console.log('Touch device:', 'ontouchstart' in window);

// Test tone control responsive behavior
const checkToneControlResponsive = () => {
  const toneControls = document.querySelectorAll('[data-tone-control]');
  console.log('Tone controls found:', toneControls.length);
  
  toneControls.forEach((control, index) => {
    const rect = control.getBoundingClientRect();
    console.log(`Control ${index}:`, {
      width: rect.width,
      height: rect.height,
      touchFriendly: rect.height >= 44
    });
  });
};
```

### **Enhanced**: Debug Mode with Security
Enable debug logging by setting:
```bash
VITE_DEBUG=true
```

### **Enhanced**: Security Monitoring
- Real-time security event tracking
- Subscription bypass attempt detection
- **NEW**: Tone control access violation monitoring
- Rate limiting violation monitoring
- Audit log analysis tools
- Session security monitoring
- Token usage monitoring

## Contributing

### Development Workflow
1. Create feature branch
2. Implement changes with security considerations
3. Add tests (including security, responsive, tone control, and token tests)
4. Update documentation
5. **Enhanced**: Verify security audit logging
6. **Enhanced**: Test responsive design across devices
7. **Enhanced**: Verify session management
8. **Enhanced**: Test token system functionality
9. **NEW**: Test tone control access restrictions
10. Submit pull request

### **Enhanced**: Security Code Standards
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Conventional commits
- **Enhanced**: Security validation for all subscription-gated features
- **Enhanced**: Comprehensive audit logging for user actions
- **Enhanced**: Input validation and sanitization
- **Enhanced**: Responsive design standards
- **Enhanced**: Token system validation
- **NEW**: Tone control access validation

### **Enhanced**: Security Review Process
- Code review required (including security review)
- Test coverage maintained (including security, responsive, tone control, and token tests)
- Documentation updated (including security implications)
- Performance impact assessed (including security overhead)
- **Enhanced**: Security audit log verification
- **Enhanced**: Subscription validation testing
- **Enhanced**: Responsive design validation
- **Enhanced**: Session management testing
- **Enhanced**: Token system validation
- **NEW**: Tone control access testing

---

## Appendix

### **Enhanced**: Security Event Types
- `user_sign_in` / `user_sign_out` / `sign_in_failed` / `sign_up_failed`
- `user_sign_out_attempt` / `user_profile_created` / `user_profile_fetch_error`
- `token_usage_attempt` / `token_limit_exceeded` / `tokens_used`
- `daily_token_limit_exceeded` / `monthly_token_limit_exceeded`
- `export_attempt` / `export_limit_exceeded` / `export_successful` / `export_unlimited`
- **NEW**: `tone_control_access` / `preset_access_attempt` / `advanced_preset_blocked`
- **NEW**: `tone_modification_blocked` / `subscription_bypass_attempt`
- `rate_limit_violation`

### **NEW**: Tone Control Event Types
- `modify_tone` - User attempts to modify tone settings
- `use_presets` - User attempts to use basic presets
- `use_advanced_presets` - User attempts to use advanced presets
- `tone_control_locked` - User attempts to use locked controls
- `preset_blocked` - User attempts to use unavailable presets

### Database Migration History
- **v1**: Initial schema (users, writing_samples, rewrite_history)
- **v2**: Credit system implementation
- **v3**: Export tracking
- **v4**: Subscription tier updates
- **v5**: Premium tier features
- **v6**: Security audit system and subscription validation
- **v7**: Billing history integration
- **v8**: Token system migration and implementation
- **v9**: Remove obsolete credits_used column
- **v10**: Auth fixes and user profile creation trigger

### **Enhanced**: Security Architecture
- **Frontend**: Subscription validation + security error handling + session management + token tracking + tone control access
- **Backend**: Database functions + audit logging + RLS policies + billing integration + token management + tone control validation
- **API**: Secure Claude integration + subscription-aware processing + token usage tracking + tone control support

### **Enhanced**: Responsive Design Architecture
- **Mobile-First**: All components start with mobile design
- **Progressive Enhancement**: Features added for larger screens
- **Touch-Optimized**: All interactions work on touch devices
- **Flexible Layouts**: Components adapt to any screen size
- **Token Display**: Responsive token formatting and display
- **NEW**: Tone Control Responsive: Touch-friendly sliders and controls

### **NEW**: Tone Control Architecture
- **Subscription-Based Access**: Controls available based on user tier
- **Security Validation**: All tone modifications validated and logged
- **Responsive Design**: Touch-friendly controls across all devices
- **Progressive Enhancement**: More controls available with higher tiers
- **Real-time Validation**: Immediate feedback on access restrictions

### API Endpoints
- **Supabase**: Database operations, authentication, security logging, billing, token management
- **Claude API**: Text rewriting service (subscription-aware with token tracking and tone control support)
- **Netlify**: Deployment and hosting

### External Dependencies
- **@supabase/supabase-js**: Database client
- **lucide-react**: Icon library
- **tailwindcss**: Styling framework with responsive utilities
- **react**: UI framework
- **typescript**: Type safety

### **Enhanced**: Security Dependencies
- Custom subscription validation system
- Security audit logging framework
- Rate limiting implementation
- Access control matrix
- Session management system
- Token usage tracking system
- **NEW**: Tone control access validation system

### Performance Benchmarks
- **Initial Load**: < 2s
- **Text Rewrite**: < 5s (standard), < 2.5s (priority), < 1.7s (premium)
- **Database Query**: < 500ms
- **Bundle Size**: < 1MB
- **Enhanced**: Security Event Logging: < 100ms overhead
- **Enhanced**: Responsive Layout Shift: < 0.1 CLS
- **Enhanced**: Token Calculation: < 10ms
- **NEW**: Tone Control Rendering: < 50ms

### **Enhanced**: Security Metrics
- **Subscription Validation**: < 50ms
- **Audit Log Write**: < 100ms
- **Rate Limit Check**: < 10ms
- **Access Control Validation**: < 25ms
- **Session Validation**: < 30ms
- **Token Usage Calculation**: < 15ms
- **NEW**: Tone Control Validation: < 20ms

### **Enhanced**: Responsive Design Metrics
- **Mobile Performance**: 90+ Lighthouse score
- **Touch Target Size**: Minimum 44px
- **Font Readability**: 16px minimum on mobile
- **Layout Shift**: < 0.1 CLS across all breakpoints
- **Token Display**: Readable on all screen sizes
- **NEW**: Tone Control Touch Targets: 44px minimum

### **Enhanced**: Token System Metrics
- **Token Estimation Accuracy**: ±5% of actual usage
- **Token Formatting Performance**: < 5ms
- **Usage Tracking Latency**: < 50ms
- **Reset Function Performance**: < 200ms

### **NEW**: Tone Control System Metrics
- **Control Rendering Performance**: < 50ms
- **Validation Response Time**: < 20ms
- **Preset Application Speed**: < 30ms
- **Security Event Logging**: < 15ms per control access

This documentation provides a comprehensive overview of the TweakMyText application architecture, implementation details, security features, responsive design system, session management, token system, advanced tone control system, and operational procedures for developers working on the project.