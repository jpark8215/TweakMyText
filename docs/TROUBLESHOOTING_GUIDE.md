# React Project Troubleshooting Guide

## Quick Diagnosis Commands

Run these commands first to gather information about your current setup:

```bash
# Check Node.js and npm versions
node --version
npm --version

# Check if development server is running
ps aux | grep "vite\|npm\|node"

# Check current directory and files
pwd
ls -la

# Check package.json scripts
cat package.json | grep -A 10 "scripts"

# Check for build errors
npm run build 2>&1 | tee build-log.txt

# Check environment variables
cat .env 2>/dev/null || echo "No .env file found"
```

## Issue 1: Local Development Preview Not Loading

### Symptoms
- Development server starts but page doesn't load
- Changes not reflecting in browser
- Blank page or loading indefinitely

### Diagnostic Steps

#### Step 1: Check Development Server Status
```bash
# Kill any existing processes
pkill -f "vite\|npm run dev"

# Start development server with verbose output
npm run dev -- --host --port 5173 --debug

# Alternative: Start with specific host binding
npm run dev -- --host 0.0.0.0
```

#### Step 2: Verify Package.json Scripts
Check your `package.json` file:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest"
  }
}
```

#### Step 3: Check Vite Configuration
Verify `vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    open: true
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
```

#### Step 4: Clear Cache and Reinstall
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Clear Vite cache
rm -rf .vite

# Reinstall dependencies
npm install

# Start development server
npm run dev
```

#### Step 5: Check for Port Conflicts
```bash
# Check what's running on port 5173
lsof -i :5173

# Kill process if needed
kill -9 <PID>

# Try different port
npm run dev -- --port 3000
```

### Common Fixes

1. **Browser Cache Issues**
   ```bash
   # Hard refresh in browser: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   # Or open developer tools and right-click refresh button -> "Empty Cache and Hard Reload"
   ```

2. **File Permission Issues**
   ```bash
   # Fix file permissions
   chmod -R 755 src/
   chmod 644 package.json
   ```

3. **Environment Variables**
   ```bash
   # Check if .env file exists and is properly formatted
   cat .env
   
   # Ensure variables start with VITE_
   echo "VITE_SUPABASE_URL=your_url_here" > .env
   echo "VITE_SUPABASE_ANON_KEY=your_key_here" >> .env
   ```

## Issue 2: Empty/Blank Page on Netlify Deployment

### Symptoms
- Local development works fine
- Netlify deployment shows blank page
- Console errors in browser

### Diagnostic Steps

#### Step 1: Check Build Process
```bash
# Test build locally
npm run build

# Check if dist folder is created
ls -la dist/

# Preview built version locally
npm run preview
```

#### Step 2: Verify Build Output
```bash
# Check dist folder contents
find dist -type f -name "*.html" -o -name "*.js" -o -name "*.css"

# Check index.html content
cat dist/index.html
```

#### Step 3: Check Netlify Build Logs
1. Go to Netlify dashboard
2. Click on your site
3. Go to "Deploys" tab
4. Click on latest deploy
5. Check build logs for errors

#### Step 4: Verify Netlify Configuration
Create `netlify.toml` in project root:
```toml
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

### Common Deployment Fixes

1. **Environment Variables on Netlify**
   ```bash
   # In Netlify dashboard:
   # Site settings > Environment variables
   # Add your environment variables:
   VITE_SUPABASE_URL=your_actual_url
   VITE_SUPABASE_ANON_KEY=your_actual_key
   ```

2. **Build Command Issues**
   ```bash
   # Ensure package.json has correct build script
   "scripts": {
     "build": "vite build"
   }
   ```

3. **Public Directory Issues**
   ```bash
   # Check public folder exists and contains index.html template
   ls -la public/
   cat public/index.html
   ```

4. **Import Path Issues**
   ```bash
   # Check for case-sensitive import issues
   grep -r "import.*from.*[A-Z]" src/
   
   # Fix relative imports
   find src -name "*.tsx" -o -name "*.ts" | xargs grep -l "\.\./\.\."
   ```

## Issue 3: File Paths and Imports

### Check Import Statements
```bash
# Find all import statements
grep -r "import" src/ | grep -v node_modules

# Check for missing file extensions
grep -r "import.*from.*[^']$" src/

# Check for incorrect relative paths
find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "import.*\.\./\.\./\.\."
```

### Fix Common Import Issues
```typescript
// ❌ Incorrect
import Component from './Component'
import { utils } from '../utils'

// ✅ Correct
import Component from './Component.tsx'
import { utils } from '../utils/index.ts'

// ❌ Case sensitivity issues
import Component from './component.tsx'

// ✅ Correct case
import Component from './Component.tsx'
```

## Issue 4: Environment Variables

### Check Environment Variables
```bash
# Verify .env file format
cat .env

# Check if variables are loaded in build
npm run build && grep -r "VITE_" dist/
```

### Correct .env Format
```bash
# .env file should look like this:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_CLAUDE_API_KEY=your-claude-key-here
```

### Environment Variable Debugging
```typescript
// Add to your main component for debugging
console.log('Environment variables:', {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 10) + '...',
  mode: import.meta.env.MODE,
  dev: import.meta.env.DEV,
  prod: import.meta.env.PROD
});
```

## Issue 5: React Router Configuration

### Check Router Setup
Since your app doesn't use React Router, ensure you're not accidentally importing it:

```bash
# Check for router imports
grep -r "react-router" src/
grep -r "BrowserRouter\|Router\|Route" src/
```

### If Router is Needed
```typescript
// Install React Router
npm install react-router-dom

// Basic setup in main.tsx
import { BrowserRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
```

## Issue 6: Public Directory Contents

### Verify Public Directory
```bash
# Check public directory structure
tree public/ || ls -la public/

# Verify index.html exists
cat public/index.html
```

### Required Public Files
```bash
# Ensure these files exist:
public/
├── index.html
└── vite.svg (optional)
```

### Check index.html Template
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Your App Title</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

## Issue 7: Node.js and npm Versions

### Check Versions
```bash
# Check current versions
node --version  # Should be 18.x or higher
npm --version   # Should be 8.x or higher

# Check package.json engines
cat package.json | grep -A 5 "engines"
```

### Update Node.js if Needed
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Or using package manager
# Ubuntu/Debian:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS with Homebrew:
brew install node@18
```

## Issue 8: Password Change Functionality

### Symptoms
- Password change appears to time out but actually succeeds
- "Back to Login" button doesn't work after password change
- User remains logged in after password change

### Diagnostic Steps

#### Step 1: Check Password Change Flow
```bash
# Look for race conditions in password update logic
grep -r "updateUser" src/
grep -r "setPasswordChangeStatus" src/
```

#### Step 2: Verify Timeout Handling
```bash
# Check for proper timeout handling
grep -r "setTimeout" src/components/SettingsModal.tsx
grep -r "clearTimeout" src/components/SettingsModal.tsx
```

#### Step 3: Check AbortController Usage
```bash
# Verify proper AbortController implementation
grep -r "AbortController" src/
grep -r "abortController.signal" src/
```

### Common Fixes

1. **Implement Proper AbortController**
   ```typescript
   // Create an AbortController to handle cancellation
   const abortController = new AbortController();
   let timeoutId: NodeJS.Timeout | null = null;
   let updateCompleted = false;

   try {
     // Set a timeout that can be cancelled
     timeoutId = setTimeout(() => {
       if (!updateCompleted) {
         abortController.abort();
         setPasswordChangeStatus('error');
         setPasswordChangeError('Password update timed out. Please try again.');
       }
     }, 30000); // 30 second timeout

     // Use abort signal with fetch if applicable
     const response = await fetch(url, { signal: abortController.signal });

     // Mark update as completed to prevent timeout
     updateCompleted = true;
     
     // Clear timeout since we got a response
     if (timeoutId) {
       clearTimeout(timeoutId);
       timeoutId = null;
     }
   } catch (error) {
     // Handle errors
   } finally {
     // Ensure timeout is cleared
     if (timeoutId) {
       clearTimeout(timeoutId);
     }
   }
   ```

2. **Fix "Back to Login" Functionality**
   ```typescript
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
   ```

3. **Prevent State Updates After Unmount**
   ```typescript
   // Use a mounted ref to prevent state updates after unmount
   const mountedRef = useRef(true);

   useEffect(() => {
     return () => {
       mountedRef.current = false;
     };
   }, []);

   // Only update state if component is still mounted
   if (mountedRef.current) {
     setPasswordChangeStatus('success');
   }
   ```

## Issue 9: Memory Leaks in React Components

### Symptoms
- Console warnings about memory leaks
- State updates on unmounted components
- Performance degradation over time

### Diagnostic Steps

#### Step 1: Check for Cleanup in useEffect
```bash
# Look for useEffect without cleanup
grep -r "useEffect" --include="*.tsx" src/ | grep -v "return"
```

#### Step 2: Check for Subscription Handling
```bash
# Check for proper subscription cleanup
grep -r "subscribe" --include="*.tsx" src/
grep -r "unsubscribe" --include="*.tsx" src/
```

### Common Fixes

1. **Add Mounted Ref for Async Operations**
   ```typescript
   const mountedRef = useRef(true);

   useEffect(() => {
     // Set to true when component mounts
     mountedRef.current = true;
     
     // Async operation
     const fetchData = async () => {
       try {
         const result = await someAsyncOperation();
         // Only update state if still mounted
         if (mountedRef.current) {
           setData(result);
         }
       } catch (error) {
         if (mountedRef.current) {
           setError(error);
         }
       }
     };
     
     fetchData();
     
     // Cleanup function
     return () => {
       mountedRef.current = false;
     };
   }, []);
   ```

2. **Proper Subscription Handling**
   ```typescript
   useEffect(() => {
     const subscription = someService.subscribe(data => {
       // Handle data
     });
     
     // Return cleanup function
     return () => {
       subscription.unsubscribe();
     };
   }, []);
   ```

3. **Cancel Fetch Requests**
   ```typescript
   useEffect(() => {
     const abortController = new AbortController();
     
     fetch(url, { signal: abortController.signal })
       .then(response => response.json())
       .then(data => {
         setData(data);
       })
       .catch(error => {
         if (error.name !== 'AbortError') {
           setError(error);
         }
       });
     
     return () => {
       abortController.abort();
     };
   }, [url]);
   ```

## Issue 10: Performance Optimization

### Symptoms
- Slow rendering, especially with large lists
- UI lag when interacting with controls
- High memory usage

### Diagnostic Steps

#### Step 1: Check for Unnecessary Re-renders
```bash
# Look for components without memoization
grep -r "export default function" --include="*.tsx" src/
```

#### Step 2: Check for Expensive Calculations
```bash
# Look for expensive operations in render
grep -r "filter\|map\|reduce\|sort" --include="*.tsx" src/
```

### Common Fixes

1. **Memoize Components with React.memo**
   ```typescript
   import React, { memo } from 'react';

   const MyComponent = memo(({ prop1, prop2 }) => {
     // Component logic
     return (
       <div>{prop1} {prop2}</div>
     );
   });

   export default MyComponent;
   ```

2. **Use useCallback for Event Handlers**
   ```typescript
   const handleClick = useCallback(() => {
     // Handler logic
   }, [dependencies]);
   ```

3. **Use useMemo for Expensive Calculations**
   ```typescript
   const filteredItems = useMemo(() => {
     return items.filter(item => item.matches(searchTerm));
   }, [items, searchTerm]);
   ```

4. **Implement Virtualization for Long Lists**
   ```bash
   # Install react-window
   npm install react-window

   # Use for long lists
   import { FixedSizeList } from 'react-window';

   const Row = ({ index, style }) => (
     <div style={style}>Item {index}</div>
   );

   const MyList = () => (
     <FixedSizeList
       height={500}
       width={300}
       itemCount={10000}
       itemSize={35}
     >
       {Row}
     </FixedSizeList>
   );
   ```

5. **Implement Pagination for Data Loading**
   ```typescript
   const [page, setPage] = useState(0);
   const [hasMore, setHasMore] = useState(true);
   const pageSize = 20;

   const loadData = async (newPage = 0) => {
     const start = newPage * pageSize;
     const end = start + pageSize - 1;
     
     const { data, count } = await fetchData(start, end);
     
     if (newPage === 0) {
       setItems(data);
     } else {
       setItems(prev => [...prev, ...data]);
     }
     
     setPage(newPage);
     setHasMore(data.length === pageSize);
   };

   const loadMore = () => {
     if (hasMore) {
       loadData(page + 1);
     }
   };
   ```

## Issue 11: Testing Setup and Execution

### Symptoms
- Tests fail to run
- Test coverage is low
- Tests pass locally but fail in CI

### Diagnostic Steps

#### Step 1: Check Testing Configuration
```bash
# Check Vitest configuration
cat vitest.config.ts

# Check test scripts in package.json
grep -A 5 "\"test\"" package.json
```

#### Step 2: Verify Test Dependencies
```bash
# Check if testing libraries are installed
npm list @testing-library/react
npm list @testing-library/jest-dom
npm list vitest
```

### Common Fixes

1. **Set Up Proper Vitest Configuration**
   ```typescript
   // vitest.config.ts
   import { defineConfig } from 'vitest/config';
   import react from '@vitejs/plugin-react';

   export default defineConfig({
     plugins: [react()],
     test: {
       environment: 'jsdom',
       globals: true,
       coverage: {
         reporter: ['text', 'json', 'html'],
         exclude: ['node_modules/', 'src/vite-env.d.ts']
       }
     }
   });
   ```

2. **Install Required Testing Dependencies**
   ```bash
   npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event vitest jsdom
   ```

3. **Add Test Setup File**
   ```typescript
   // src/test/setup.ts
   import '@testing-library/jest-dom';
   
   // Add any global test setup here
   ```

4. **Write Basic Component Tests**
   ```typescript
   // src/__tests__/Component.test.tsx
   import { describe, it, expect } from 'vitest';
   import { render, screen } from '@testing-library/react';
   import Component from '../components/Component';

   describe('Component', () => {
     it('renders correctly', () => {
       render(<Component />);
       expect(screen.getByText('Expected Text')).toBeInTheDocument();
     });
   });
   ```

5. **Add Test Coverage Script**
   ```json
   // package.json
   {
     "scripts": {
       "test": "vitest",
       "test:coverage": "vitest run --coverage"
     }
   }
   ```

## Issue 12: Password Change Timeout Issues

### Symptoms
- Password change appears to time out but actually succeeds
- User gets "Password update timed out" message even though password was changed
- Inconsistent behavior with password updates

### Diagnostic Steps

#### Step 1: Check for Race Conditions
```bash
# Look for race conditions in password update logic
grep -r "updateUser" src/components/SettingsModal.tsx
```

#### Step 2: Check Error Handling
```bash
# Look for error handling in password update
grep -r "catch" src/components/SettingsModal.tsx
```

#### Step 3: Check State Management
```bash
# Look for state updates in password change flow
grep -r "setPasswordChangeStatus" src/components/SettingsModal.tsx
```

### Common Fixes

1. **Implement Proper Completion Flag**
   ```typescript
   // Add a completion flag to prevent timeout from firing after success
   let updateCompleted = false;
   
   try {
     // Set a timeout
     const timeoutId = setTimeout(() => {
       if (!updateCompleted) {
         // Only show timeout error if not completed
         setPasswordChangeStatus('error');
         setPasswordChangeError('Password update timed out. Please try again.');
       }
     }, 30000);
     
     // Perform update
     const { data, error } = await supabase.auth.updateUser({
       password: newPassword
     });
     
     // Mark as completed
     updateCompleted = true;
     
     // Clear timeout
     clearTimeout(timeoutId);
     
     // Handle result
     if (error) {
       setPasswordChangeStatus('error');
       setPasswordChangeError(error.message);
     } else {
       setPasswordChangeStatus('success');
     }
   } catch (error) {
     // Mark as completed to prevent timeout
     updateCompleted = true;
     
     // Handle error
     setPasswordChangeStatus('error');
     setPasswordChangeError('An unexpected error occurred');
   }
   ```

2. **Use AbortController for Cancellation**
   ```typescript
   const abortController = new AbortController();
   
   try {
     // Set timeout to abort after 30 seconds
     const timeoutId = setTimeout(() => {
       abortController.abort();
     }, 30000);
     
     // Use abort signal if applicable
     // For Supabase, we can't directly use the signal, but we can check it
     
     if (abortController.signal.aborted) {
       throw new Error('Operation was aborted');
     }
     
     // Perform update
     const { data, error } = await supabase.auth.updateUser({
       password: newPassword
     });
     
     // Clear timeout
     clearTimeout(timeoutId);
     
     // Handle result
   } catch (error) {
     // Handle error, checking if it was aborted
     if (error.name === 'AbortError' || abortController.signal.aborted) {
       setPasswordChangeStatus('error');
       setPasswordChangeError('Password update timed out. Please try again.');
     } else {
       // Handle other errors
     }
   }
   ```

3. **Improve Error Handling and Feedback**
   ```typescript
   try {
     // Attempt password update
     const { data, error } = await supabase.auth.updateUser({
       password: newPassword
     });
     
     if (error) {
       // Provide specific error messages based on error type
       let errorMessage = 'Password update failed. ';
       
       switch (error.message) {
         case 'New password should be different from the old password.':
           errorMessage = 'New password must be different from your current password.';
           break;
         case 'Password should be at least 6 characters.':
           errorMessage = 'Password must be at least 6 characters long.';
           break;
         case 'JWT expired':
           errorMessage = 'Your session has expired. Please sign out and sign back in.';
           break;
         default:
           errorMessage += error.message;
       }
       
       setPasswordChangeStatus('error');
       setPasswordChangeError(errorMessage);
     } else {
       setPasswordChangeStatus('success');
       // Clear form fields
       setNewPassword('');
       setConfirmPassword('');
     }
   } catch (error) {
     // Handle unexpected errors
     setPasswordChangeStatus('error');
     setPasswordChangeError('An unexpected error occurred. Please try again.');
   }
   ```

## Complete Reset Procedure

If all else fails, try this complete reset:

```bash
# 1. Backup your src folder
cp -r src src_backup

# 2. Clean everything
rm -rf node_modules package-lock.json .vite dist

# 3. Clear npm cache
npm cache clean --force

# 4. Reinstall dependencies
npm install

# 5. Check for dependency conflicts
npm ls

# 6. Try building
npm run build

# 7. Test locally
npm run preview

# 8. If working, redeploy to Netlify
```

## Debugging Browser Console

### Check Browser Console
1. Open browser developer tools (F12)
2. Check Console tab for errors
3. Check Network tab for failed requests
4. Check Sources tab to verify files are loaded

### Common Console Errors and Fixes

1. **"Failed to fetch dynamically imported module"**
   ```bash
   # Clear build cache and rebuild
   rm -rf dist .vite
   npm run build
   ```

2. **"Uncaught SyntaxError: Unexpected token"**
   ```bash
   # Check for TypeScript compilation errors
   npx tsc --noEmit
   ```

3. **"Module not found"**
   ```bash
   # Check import paths and file existence
   find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "import.*from.*['\"]\./"
   ```

## Netlify-Specific Debugging

### Check Netlify Deploy Settings
1. Build command: `npm run build`
2. Publish directory: `dist`
3. Node version: 18.x

### Netlify Build Environment
```bash
# Add to netlify.toml for debugging
[build]
  command = "npm run build && ls -la dist/"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "8"
```

### Force Redeploy
```bash
# Trigger new deploy
git commit --allow-empty -m "Force redeploy"
git push origin main
```

## Final Checklist

- [ ] Node.js version 18+ installed
- [ ] npm cache cleared
- [ ] Dependencies reinstalled
- [ ] Build completes without errors
- [ ] Local preview works
- [ ] Environment variables set correctly
- [ ] Netlify configuration correct
- [ ] No console errors in browser
- [ ] All imports use correct paths and extensions
- [ ] Tests pass with `npm run test`

## Getting Help

If issues persist:

1. **Check build logs carefully** - Most issues are revealed in build output
2. **Test locally first** - Always ensure local build works before deploying
3. **Use browser dev tools** - Console and Network tabs show most client-side issues
4. **Check Netlify deploy logs** - Server-side build issues appear here
5. **Verify environment variables** - Many deployment issues are due to missing env vars
6. **Run tests** - Use `npm run test` to verify functionality

## Emergency Recovery

If you need to quickly get a working version:

```bash
# Create minimal working version
npx create-vite@latest temp-project --template react-ts
cd temp-project
npm install
npm run build
npm run preview

# Copy your src files gradually to identify the issue
```

This troubleshooting guide should help you identify and resolve the most common issues with React development and Netlify deployment.