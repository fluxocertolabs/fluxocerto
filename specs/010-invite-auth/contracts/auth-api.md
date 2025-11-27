# Auth API Contracts

**Feature Branch**: `010-invite-auth`  
**Date**: 2025-11-27

This document defines the client-side API contracts for authentication. These are implemented using the Supabase JS client library, not custom REST endpoints.

---

## Supabase Auth Client Methods

### 1. Request Magic Link

**Method**: `supabase.auth.signInWithOtp()`

**Purpose**: Send a Magic Link email to the user for passwordless authentication.

**Request**:
```typescript
interface SignInWithOtpRequest {
  email: string
  options?: {
    emailRedirectTo?: string  // Callback URL after clicking link
    shouldCreateUser?: boolean  // Default: true
  }
}
```

**Response**:
```typescript
interface SignInWithOtpResponse {
  data: {
    user: null  // User not created until link clicked
    session: null
  }
  error: AuthError | null
}

interface AuthError {
  message: string
  status: number
  name: string
}
```

**Example**:
```typescript
const { error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: {
    emailRedirectTo: `${window.location.origin}/auth/confirm`,
  },
})
```

**Error Codes**:
| Code | Description | User Message |
|------|-------------|--------------|
| `over_request_rate_limit` | Too many requests | "Too many requests. Please wait a few minutes and try again." |
| `validation_failed` | Invalid email format | "Please enter a valid email address." |

---

### 2. Get Current Session

**Method**: `supabase.auth.getSession()`

**Purpose**: Retrieve the current user session from storage.

**Request**: None

**Response**:
```typescript
interface GetSessionResponse {
  data: {
    session: Session | null
  }
  error: AuthError | null
}

interface Session {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at: number
  token_type: string
  user: User
}

interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
  app_metadata: {
    provider: string
    providers: string[]
  }
  user_metadata: Record<string, unknown>
}
```

**Example**:
```typescript
const { data: { session }, error } = await supabase.auth.getSession()
if (session) {
  console.log('User:', session.user.email)
}
```

---

### 3. Listen to Auth State Changes

**Method**: `supabase.auth.onAuthStateChange()`

**Purpose**: Subscribe to authentication state changes for reactive UI updates.

**Callback Parameters**:
```typescript
type AuthChangeEvent =
  | 'INITIAL_SESSION'
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'PASSWORD_RECOVERY'

interface AuthChangeCallback {
  (event: AuthChangeEvent, session: Session | null): void
}
```

**Response**:
```typescript
interface AuthStateChangeResponse {
  data: {
    subscription: {
      unsubscribe: () => void
    }
  }
}
```

**Example**:
```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (event, session) => {
    if (event === 'SIGNED_IN') {
      // User signed in
    } else if (event === 'SIGNED_OUT') {
      // User signed out
    }
  }
)

// Cleanup
subscription.unsubscribe()
```

---

### 4. Sign Out

**Method**: `supabase.auth.signOut()`

**Purpose**: Sign out the current user and clear session.

**Request**: None

**Response**:
```typescript
interface SignOutResponse {
  error: AuthError | null
}
```

**Example**:
```typescript
const { error } = await supabase.auth.signOut()
```

---

### 5. Verify OTP (Magic Link Callback)

**Method**: `supabase.auth.verifyOtp()` (if manual handling needed)

**Purpose**: Verify the Magic Link token from URL.

**Note**: With `detectSessionInUrl: true` in Supabase client config, this is handled automatically. Manual verification is only needed for custom flows.

**Request**:
```typescript
interface VerifyOtpRequest {
  token_hash: string
  type: 'magiclink'
}
```

**Response**:
```typescript
interface VerifyOtpResponse {
  data: {
    user: User | null
    session: Session | null
  }
  error: AuthError | null
}
```

**Error Codes**:
| Code | Description | User Message |
|------|-------------|--------------|
| `otp_expired` | Magic Link expired | "This link has expired. Please request a new one." |
| `otp_disabled` | OTP disabled for project | "Login links are not enabled." |

---

## Edge Function: before-user-created

**Endpoint**: Supabase Auth Hook (not directly callable)

**Trigger**: Automatically called by Supabase Auth before creating a new user.

**Input Payload** (from Supabase):
```typescript
interface BeforeUserCreatedPayload {
  metadata: {
    uuid: string
    time: string  // ISO 8601
    name: 'before-user-created'
    ip_address: string
  }
  user: {
    id: string
    aud: string
    role: string
    email: string
    phone: string
    app_metadata: {
      provider: string
      providers: string[]
    }
    user_metadata: Record<string, unknown>
    identities: unknown[]
    created_at: string
    updated_at: string
    is_anonymous: boolean
  }
}
```

**Success Response** (allow signup):
```json
{}
```
HTTP Status: 200 OK or 204 No Content

**Error Response** (block signup):
```typescript
interface BlockSignupResponse {
  error: {
    http_code: number  // 400
    message: string
  }
}
```

**Example Error Response**:
```json
{
  "error": {
    "http_code": 400,
    "message": "Signup not allowed"
  }
}
```

---

## Client-Side Error Handling Contract

All auth operations should map errors to user-friendly messages:

```typescript
interface AuthErrorMapping {
  [key: string]: string
}

const AUTH_ERROR_MESSAGES: AuthErrorMapping = {
  'otp_expired': 'This link has expired. Please request a new one.',
  'over_request_rate_limit': 'Too many requests. Please wait a few minutes and try again.',
  'validation_failed': 'Please enter a valid email address.',
  'user_not_found': 'Check your email for the login link.',  // Same message for security
  'invalid_credentials': 'Check your email for the login link.',  // Same message for security
  'network_error': 'Unable to connect. Please check your internet connection.',
  'default': 'Something went wrong. Please try again.',
}
```

---

## Route Contracts

### `/login`
- **Access**: Public (unauthenticated only)
- **Redirect**: To `/` if already authenticated

### `/auth/confirm`
- **Access**: Public
- **Purpose**: Handle Magic Link callback
- **Redirect**: To `/` on success, show error on failure

### `/` (Dashboard)
- **Access**: Protected (authenticated only)
- **Redirect**: To `/login` if unauthenticated

### `/manage`
- **Access**: Protected (authenticated only)
- **Redirect**: To `/login` if unauthenticated

