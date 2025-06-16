# TweakMyText Developer Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Authentication & Authorization](#authentication--authorization)
5. [Subscription System](#subscription-system)
6. [Credit System](#credit-system)
7. [API Integration](#api-integration)
8. [Component Structure](#component-structure)
9. [State Management](#state-management)
10. [Deployment](#deployment)
11. [Development Setup](#development-setup)
12. [Testing](#testing)
13. [Performance Considerations](#performance-considerations)
14. [Security](#security)
15. [Troubleshooting](#troubleshooting)

## Project Overview

TweakMyText is an AI-powered writing style rewriter application that analyzes user writing samples to learn their unique voice and tone, then transforms any input text to match that style. The application features a freemium subscription model with three tiers: Free, Pro, and Premium.

### Key Features
- **Writing Style Analysis**: AI-powered analysis of user writing samples
- **Text Rewriting**: Transform any text to match learned writing style
- **Tone Controls**: Adjustable parameters for formality, casualness, enthusiasm, and technicality
- **Subscription Tiers**: Free, Pro, and Premium with different feature sets
- **Credit System**: Usage-based billing with daily/monthly limits
- **Export Functionality**: Export results in multiple formats
- **Rewrite History**: Track and access previous rewrites

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI Integration**: Claude API (with fallback mock implementation)
- **Deployment**: Netlify (configurable)

## Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │────│   Supabase      │────│   Claude API    │
│   (Frontend)    │    │   (Backend)     │    │   (AI Service)  │
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
│   └── WritingSample Management
├── TextRewriter
│   ├── ToneControls
│   └── ComparisonView
└── SubscriptionManagement
```

### Data Flow
1. User authenticates via Supabase Auth
2. Writing samples stored in `writing_samples` table
3. Style analysis performed on samples
4. Text rewriting via Claude API or mock service
5. Results stored in `rewrite_history` table
6. Credit/export tracking in `users` table

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

### Row Level Security (RLS)
All tables have RLS enabled with policies ensuring users can only access their own data:
- `auth.uid() = user_id` for data access
- `auth.uid() = id` for user profile access

### Database Functions

#### `reset_daily_credits()`
Resets daily credits for free tier users at midnight UTC.

#### `reset_monthly_credits()`
Resets monthly credits and exports on user's signup anniversary.

## Authentication & Authorization

### Supabase Auth Integration
- Email/password authentication
- No email confirmation required
- Automatic user profile creation on signup
- JWT-based session management

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

### Authentication Hook
The `useAuth` hook provides:
- User state management
- Sign in/up/out functions
- Credit management
- Export tracking

## Subscription System

### Tier Comparison

| Feature | Free | Pro | Premium |
|---------|------|-----|---------|
| Monthly Rewrites | 90 (3/day) | 200 | 300 |
| Writing Samples | 3 | 25 | 100 |
| Monthly Exports | 5 | 200 | Unlimited |
| Processing Speed | 1x | 2x | 3x |
| Style Analysis | Basic | Advanced | Extended |
| Tone Controls | Basic | Presets | Custom Fine-Tuning |
| Daily Limits | Yes | No | No |
| History Access | No | Yes | Yes |
| Support | Community | Email | Priority |

### Subscription Limits Implementation
```typescript
const getSubscriptionLimits = (tier: string) => {
  switch (tier) {
    case 'pro':
      return {
        dailyLimit: -1, // No daily limit
        monthlyLimit: 200,
        exportLimit: 200,
        maxSamples: 25,
        hasAdvancedAnalysis: true,
        hasPriorityProcessing: true,
        hasTonePresets: true
      };
    case 'premium':
      return {
        dailyLimit: -1, // No daily limit
        monthlyLimit: 300,
        exportLimit: -1, // Unlimited
        maxSamples: 100,
        hasExtendedAnalysis: true,
        hasCustomTuning: true
      };
    default: // free
      return {
        dailyLimit: 3,
        monthlyLimit: 90,
        exportLimit: 5,
        maxSamples: 3
      };
  }
};
```

## Credit System

### Credit Management
- **Free Tier**: 3 credits/day, 90/month max
- **Pro Tier**: 200 credits/month, no daily limit
- **Premium Tier**: 300 credits/month, no daily limit

### Reset Logic
- **Daily Reset**: Midnight UTC for free users only
- **Monthly Reset**: On signup anniversary day
- **Automatic Resets**: Handled by database functions

### Credit Tracking
```typescript
const updateCredits = async (creditsUsed: number) => {
  // Check limits based on subscription tier
  // Update credits_remaining, daily_credits_used, monthly_credits_used
  // Handle automatic resets
};
```

## API Integration

### Claude API Integration
Primary AI service for text rewriting with fallback to mock implementation.

```typescript
const rewriteWithClaude = async (
  originalText: string,
  samples: WritingSample[],
  toneSettings: ToneSettings,
  apiKey: string
): Promise<RewriteResult> => {
  // Construct prompt with samples and tone instructions
  // Call Claude API
  // Parse and return results
};
```

### Mock Implementation
Fallback service for development and when Claude API is unavailable.

```typescript
const rewriteText = async (
  originalText: string,
  samples: WritingSample[],
  toneSettings: ToneSettings
): Promise<RewriteResult> => {
  // Style analysis based on samples
  // Rule-based text transformation
  // Confidence scoring
};
```

## Component Structure

### Core Components

#### `App.tsx`
Main application component handling:
- Route management between capture/rewrite/subscription views
- Modal state management
- User authentication state
- Global navigation

#### `StyleCapture.tsx`
Writing sample management:
- Sample CRUD operations
- Subscription limit enforcement
- Auto-save functionality
- Sample validation

#### `TextRewriter.tsx`
Text rewriting interface:
- Input text management
- AI service integration
- Credit consumption
- Results display

#### `ToneControls.tsx`
Tone adjustment interface:
- Slider controls for tone parameters
- Preset management (Pro/Premium)
- Custom fine-tuning (Premium)

#### `ComparisonView.tsx`
Side-by-side text comparison:
- Original vs rewritten text
- Style analysis display
- Confidence scoring
- Export functionality

### Modal Components

#### `AuthModal.tsx`
Authentication interface:
- Sign in/up forms
- Error handling
- Welcome messaging

#### `SettingsModal.tsx`
User settings management:
- Password updates
- Account information
- Subscription management links

#### `PricingModal.tsx`
Subscription tier comparison:
- Feature comparison
- Upgrade flows
- Pricing information

#### `SubscriptionManagement.tsx`
Subscription administration:
- Current plan details
- Billing history
- Cancellation flows

## State Management

### Local State
- Component-level state using `useState`
- Form state management
- UI state (modals, loading, errors)

### Global State
- User authentication via `useAuth` hook
- Writing samples passed between components
- Subscription limits computed from user data

### Data Persistence
- Writing samples: Supabase database
- User preferences: Local storage
- Session state: Supabase Auth

## Deployment

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
- **Netlify**: Primary deployment platform
- **Vercel**: Alternative platform
- **Static hosting**: Any static file server

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

### Database Setup
1. Create Supabase project
2. Run migrations in order:
   - `20250610021118_lucky_trail.sql`
   - `20250610021127_blue_night.sql`
   - `20250610021136_sunny_ember.sql`
   - `20250610022549_green_cloud.sql`
   - `20250613022528_round_truth.sql`
   - `20250616002520_pink_cottage.sql`
   - `20250616003152_bitter_mouse.sql`
   - `20250616012605_lucky_sky.sql`

### Development Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## Testing

### Testing Strategy
- Component testing with React Testing Library
- Integration testing for user flows
- Database testing with Supabase local development
- API testing with mock services

### Test Structure
```
src/
├── __tests__/
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   └── integration/
```

### Running Tests
```bash
npm run test         # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

## Performance Considerations

### Optimization Strategies
- **Code Splitting**: Dynamic imports for large components
- **Lazy Loading**: Defer non-critical component loading
- **Memoization**: React.memo for expensive components
- **Database Indexing**: Optimized queries with proper indexes

### Performance Monitoring
- Bundle size analysis
- Core Web Vitals tracking
- Database query performance
- API response times

### Caching Strategy
- Browser caching for static assets
- Service worker for offline functionality
- Database query caching
- API response caching

## Security

### Security Measures
- **Row Level Security**: Database-level access control
- **Input Validation**: Client and server-side validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Prevention**: Content sanitization
- **CSRF Protection**: Token-based protection

### Data Protection
- **Encryption**: Data encrypted at rest and in transit
- **Access Control**: Role-based permissions
- **Audit Logging**: User action tracking
- **Data Retention**: Configurable retention policies

### API Security
- **Rate Limiting**: Prevent API abuse
- **Authentication**: JWT-based auth
- **Authorization**: Role-based access
- **Input Sanitization**: Prevent injection attacks

## Troubleshooting

### Common Issues

#### Authentication Problems
```typescript
// Check Supabase configuration
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY);

// Verify user session
const { data: { session } } = await supabase.auth.getSession();
console.log('Current session:', session);
```

#### Database Connection Issues
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'users';

-- Verify user permissions
SELECT auth.uid(), auth.role();
```

#### Credit System Issues
```typescript
// Debug credit calculations
console.log('User credits:', user.credits_remaining);
console.log('Daily used:', user.daily_credits_used);
console.log('Monthly used:', user.monthly_credits_used);
console.log('Last reset:', user.last_credit_reset);
```

#### API Integration Issues
```typescript
// Test Claude API connection
const testClaudeAPI = async () => {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': import.meta.env.VITE_CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Hello' }]
      })
    });
    console.log('Claude API Status:', response.status);
  } catch (error) {
    console.error('Claude API Error:', error);
  }
};
```

### Debug Mode
Enable debug logging by setting:
```bash
VITE_DEBUG=true
```

### Error Monitoring
- Console error tracking
- User feedback collection
- Performance monitoring
- Crash reporting

## Contributing

### Development Workflow
1. Create feature branch
2. Implement changes
3. Add tests
4. Update documentation
5. Submit pull request

### Code Standards
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Conventional commits

### Review Process
- Code review required
- Test coverage maintained
- Documentation updated
- Performance impact assessed

---

## Appendix

### Database Migration History
- **v1**: Initial schema (users, writing_samples, rewrite_history)
- **v2**: Credit system implementation
- **v3**: Export tracking
- **v4**: Subscription tier updates
- **v5**: Premium tier features

### API Endpoints
- **Supabase**: Database operations, authentication
- **Claude API**: Text rewriting service
- **Netlify**: Deployment and hosting

### External Dependencies
- **@supabase/supabase-js**: Database client
- **lucide-react**: Icon library
- **tailwindcss**: Styling framework
- **react**: UI framework
- **typescript**: Type safety

### Performance Benchmarks
- **Initial Load**: < 2s
- **Text Rewrite**: < 5s
- **Database Query**: < 500ms
- **Bundle Size**: < 1MB

This documentation provides a comprehensive overview of the TweakMyText application architecture, implementation details, and operational procedures for developers working on the project.