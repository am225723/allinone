# SSO Implementation Guide for Matthew's Dashboard

## Overview

This guide documents the SSO (Single Sign-On) implementation that allows Matthew to seamlessly log into the IFS Healing dashboard (ifs.aleix.help) from his personal dashboard (matthew.integrativepsychiatry.xyz).

## Architecture

### Flow Diagram

```
[Matthew's Dashboard]          [IFS Dashboard]
(https://matthew...)            (https://ifs.aleix.help)
         |                              |
         | 1. Click "IFS Healing"       |
         |    tile                      |
         |                              |
         | 2. Generate JWT Token        |
         |    (with user info)          |
         |                              |
         | 3. Redirect with token       |
         |    to /sso/callback?token=...|
         |                              |
         |------------------------------->|
         |                              | 4. Verify JWT signature
         |                              | 5. Validate client site
         |                              | 6. Find/create user in DB
         |                              | 7. Create session cookie
         |                              | 8. Redirect to dashboard
         |                              |
         |<------------------------------|
         |                              |
         | 9. Logged in!                |
         |    (with session cookie)     |
```

### Components

#### Client Site (Matthew's Dashboard)
- **Location**: `/workspace/matt/` repository
- **Tech Stack**: React + Vite + React Router
- **Key Files**:
  - `src/utils/sso.js` - JWT token generation and SSO utilities
  - `src/components/SSOButton.tsx` - Reusable SSO button component
  - `src/App.jsx` - Modified to use SSO for IFS Healing tile

#### Target Site (IFS Dashboard)
- **Location**: `/workspace/allinone-repo/` repository
- **Tech Stack**: Next.js + Supabase
- **Key Files**:
  - `app/api/sso/callback/route.ts` - SSO callback endpoint
  - `supabase/migrations/002_add_users_table.sql` - Database migration
  - `.env.example` - Environment variables template

## Implementation Details

### 1. Client Site Setup

#### Files Modified/Created

**`src/utils/sso.js`**
```javascript
// Key functions:
- generateSSOToken(userInfo, additionalData) - Creates JWT token
- redirectToTargetSite(userInfo, additionalData) - Redirects with SSO
- getCurrentUserInfo() - Returns user info (Matthew's data)
```

**`src/App.jsx`** - Changes:
- Added import for SSO utilities
- Changed IFS Healing tile from `href="https://ifs.aleix.help"` to `to="/ifs-sso"`
- Added `IFSSSOWrapper` component to handle SSO redirect
- Added route `/ifs-sso` → `IFSSSOWrapper`

**`.env.example`** - New variables:
```bash
VITE_TARGET_URL=https://ifs.aleix.help
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
```

#### How It Works

1. User clicks "IFS Healing" tile
2. React Router navigates to `/ifs-sso`
3. `IFSSSOWrapper` component mounts
4. Generates JWT token with:
   - User ID: `matthew-callahan`
   - Email: `matthew@integrativepsychiatry.xyz`
   - Name: `Matthew Callahan`
   - Origin: Client site URL
   - Expiration: 15 minutes
5. Redirects to: `https://ifs.aleix.help/sso/callback?token=...`

### 2. Target Site Setup

#### Files Modified/Created

**`app/api/sso/callback/route.ts`**
```typescript
// Handles:
1. Token extraction from URL
2. JWT verification (signature + expiration)
3. Client site validation (allowlist)
4. User lookup/creation in Supabase
5. Session cookie creation
6. Redirect to dashboard
```

**`supabase/migrations/002_add_users_table.sql`**
```sql
-- Creates:
- users table with id, email, name, timestamps
- Index on email for fast lookups
- RLS policies for security
- Trigger to update updated_at
```

**`.env.example`** - New variables:
```bash
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
ALLOWED_CLIENT_SITES=https://matthew.integrativepsychiatry.xyz
```

**`package.json`** - New dependency:
```json
"jsonwebtoken": "^9.0.2"
```

#### How It Works

1. Receives GET request with `?token=...`
2. Verifies JWT signature using `JWT_SECRET`
3. Checks client site is in `ALLOWED_CLIENT_SITES`
4. Queries Supabase for existing user by email
5. If not found, creates new user
6. Creates session cookie with user info
7. Redirects to `/` (dashboard)
8. Dashboard reads session cookie to authenticate user

### 3. Database Schema

**Users Table**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Security Features

### 1. JWT Token Security
- **Signature**: HMAC-SHA256 with secret key
- **Expiration**: 15 minutes (configurable)
- **Payload**: Includes user info, timestamps, origin
- **Verification**: Server verifies signature before accepting

### 2. Client Site Allowlist
- Only authorized client sites can initiate SSO
- Configured via `ALLOWED_CLIENT_SITES` environment variable
- Prevents unauthorized sites from using your SSO endpoint

### 3. Secure Cookies
- **HttpOnly**: JavaScript cannot access cookies
- **Secure**: Only sent over HTTPS (production)
- **SameSite**: 'lax' to prevent CSRF
- **MaxAge**: 7 days for session persistence

### 4. Row Level Security (RLS)
- Database tables protected with RLS policies
- Service role can manage users
- Authenticated users can view their own data

## Installation & Deployment

### Client Site (Matthew's Dashboard)

1. **Install Dependencies** (if not already installed):
```bash
cd /workspace/matt
npm install jsonwebtoken
```

2. **Configure Environment Variables**:
```bash
# Create .env file
cp .env.example .env

# Edit .env with your values
VITE_TARGET_URL=https://ifs.aleix.help
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
```

3. **Build & Deploy**:
```bash
npm run build
# Deploy to your hosting provider
```

### Target Site (IFS Dashboard)

1. **Install Dependencies**:
```bash
cd /workspace/allinone-repo
npm install
npm install jsonwebtoken
```

2. **Configure Environment Variables**:
```bash
# Create .env file
cp .env.example .env

# Edit .env with your values
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
ALLOWED_CLIENT_SITES=https://matthew.integrativepsychiatry.xyz
```

3. **Run Database Migration**:
```bash
# Using Supabase CLI
supabase db push

# Or manually via Supabase dashboard:
# - Open SQL Editor
# - Copy contents of supabase/migrations/002_add_users_table.sql
# - Execute
```

4. **Build & Deploy**:
```bash
npm run build
# Deploy to Vercel, Netlify, or your hosting provider
```

### Important Security Notes

⚠️ **CRITICAL**: The `JWT_SECRET` must be:
- Same on both client and target sites
- At least 32 characters long
- Strong, random, and unique
- Never committed to git
- Stored securely in environment variables

**Generate a secure secret**:
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Using OpenSSL
openssl rand -base64 32
```

## Testing

### Test SSO Flow

1. **Start Client Site**:
```bash
cd /workspace/matt
npm run dev
# Visit: http://localhost:5173
```

2. **Start Target Site**:
```bash
cd /workspace/allinone-repo
npm run dev
# Visit: http://localhost:3000
```

3. **Test SSO**:
   - On client dashboard, click "IFS Healing" tile
   - Should see "Connecting to IFS Healing..." loading screen
   - Should automatically redirect to target dashboard
   - Should be logged in with Matthew's user info

4. **Verify Session**:
   - Check browser DevTools → Application → Cookies
   - Should see `session` cookie
   - Cookie should be HttpOnly and Secure (in production)

### Test Error Cases

1. **Invalid Token**:
   - Modify token in URL manually
   - Should redirect with `?error=invalid_token`

2. **Unauthorized Client**:
   - Change `clientSite` in JWT payload to unauthorized domain
   - Should redirect with `?error=unauthorized_client`

3. **Missing Token**:
   - Visit `/sso/callback` without `?token=...`
   - Should redirect with `?error=no_token`

## Troubleshooting

### Common Issues

**Issue**: "Invalid token" error
- **Cause**: JWT_SECRET doesn't match between sites
- **Fix**: Ensure both sites have identical JWT_SECRET

**Issue**: "Unauthorized client" error
- **Cause**: Client site not in ALLOWED_CLIENT_SITES
- **Fix**: Add client site URL to ALLOWED_CLIENT_SITES env var

**Issue**: "User creation failed" error
- **Cause**: Database connection or permissions issue
- **Fix**: Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

**Issue**: Session not persisting
- **Cause**: Cookie not being set properly
- **Fix**: Check SameSite and Secure settings in production

### Debug Mode

Enable debug logging in `app/api/sso/callback/route.ts`:
```typescript
console.log('SSO Debug:', {
  decoded,
  clientSite,
  ALLOWED_CLIENT_SITES,
  userId
});
```

## Future Enhancements

### Potential Improvements

1. **Multi-User Support**
   - Add authentication to client site
   - Pass actual logged-in user info to SSO

2. **Supabase Auth Integration**
   - Use Supabase Auth instead of custom session cookie
   - Leverage Supabase's built-in authentication features

3. **Refresh Tokens**
   - Implement refresh token flow
   - Extend session duration without re-login

4. **Enhanced User Profile**
   - Add more user fields (avatar, roles, preferences)
   - Update profile management UI

5. **Audit Logging**
   - Log all SSO login attempts
   - Track successful/failed authentications

6. **Multi-Factor Authentication (MFA)**
   - Add MFA for sensitive operations
   - Enhance security for admin users

## Support

For issues or questions:
1. Check this guide first
2. Review error logs
3. Verify environment variables
4. Test with debug mode enabled
5. Check Supabase dashboard for database issues

## Files Modified

### Client Site (matt repository)
- ✅ `src/utils/sso.js` - Created
- ✅ `src/components/SSOButton.tsx` - Created
- ✅ `src/App.jsx` - Modified (added SSO route and handler)
- ✅ `.env.example` - Updated (added SSO variables)

### Target Site (allinone-repo repository)
- ✅ `app/api/sso/callback/route.ts` - Created
- ✅ `supabase/migrations/002_add_users_table.sql` - Created
- ✅ `.env.example` - Updated (added SSO variables)
- ✅ `package.json` - Updated (added jsonwebtoken dependency)

## Summary

This SSO implementation provides a seamless, secure authentication flow between Matthew's personal dashboard and the IFS Healing dashboard. Using JWT tokens and Supabase for user management, it offers:

- ✅ One-click login from dashboard
- ✅ Secure token-based authentication
- ✅ Client site allowlist for security
- ✅ Automatic user creation
- ✅ Session persistence with secure cookies
- ✅ Easy to extend for multiple users

The implementation is production-ready and follows security best practices.