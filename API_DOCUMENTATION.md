# API Documentation

## Overview

Tesslate Studio Lite provides a comprehensive REST API for managing users, chat sessions, payments, and AI interactions. All APIs follow RESTful conventions with JSON request/response formats and standard HTTP status codes.

## Base URL

```
Production: https://your-domain.com/api
Development: http://localhost:3001/api
```

## Authentication

### Session-Based Authentication

The API uses Firebase Authentication with server-side session cookies for security.

```http
Cookie: __session=<firebase-session-token>
```

### Authentication Flow

1. **Client Authentication**: Use Firebase SDK to authenticate
2. **Session Exchange**: POST to `/api/auth/session` with ID token
3. **Subsequent Requests**: Session cookie automatically included

### Example Authentication

```javascript
// Frontend authentication
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

const { user } = await signInWithEmailAndPassword(auth, email, password);
const idToken = await user.getIdToken();

// Exchange for session cookie
await fetch('/api/auth/session', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${idToken}` }
});
```

## Core API Endpoints

### Authentication

#### Create Session
```http
POST /api/auth/session
Authorization: Bearer <firebase-id-token>
```

**Description**: Exchange Firebase ID token for session cookie

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "firebase-uid",
    "email": "user@example.com",
    "displayName": "John Doe"
  }
}
```

### User Management

#### Get Current User
```http
GET /api/user
```

**Response**:
```json
{
  "id": "firebase-uid",
  "email": "user@example.com",
  "displayName": "John Doe",
  "photoUrl": "https://...",
  "isGuest": false,
  "guestMessageCount": 0,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### Update User Key
```http
POST /api/user/key
Content-Type: application/json

{
  "action": "regenerate"
}
```

**Response**:
```json
{
  "success": true,
  "newKey": "sk-litellm-..."
}
```

### Chat Management

#### Get Chat History
```http
GET /api/chat/history
```

**Response**:
```json
[
  {
    "id": "session-uuid",
    "title": "Chat about React components",
    "userId": "firebase-uid",
    "selectedModelId": "groq-llama-3.1-70b",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T01:00:00.000Z",
    "messages": [
      {
        "id": "message-uuid",
        "sessionId": "session-uuid",
        "role": "user",
        "content": {
          "type": "text",
          "text": "Create a React button component"
        },
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
]
```

#### Save Chat Session
```http
POST /api/chat/history
Content-Type: application/json

{
  "id": "session-uuid",
  "title": "Chat Title",
  "selectedModelId": "groq-llama-3.1-70b",
  "messages": [
    {
      "id": "message-uuid",
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Hello, create a React component"
        }
      ]
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "sessionId": "session-uuid"
}
```

#### Get Guest Message Count
```http
GET /api/chat/guest-count
```

**Response**:
```json
{
  "count": 5,
  "limit": 10,
  "remaining": 5
}
```

### AI Chat Proxy

#### Chat Completion
```http
POST /api/proxy/chat
Content-Type: application/json

{
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user", 
      "content": "Create a React button component"
    }
  ],
  "selectedModelId": "groq-llama-3.1-70b",
  "stream": true
}
```

**Streaming Response**:
```
Content-Type: text/event-stream

data: {"choices":[{"delta":{"content":"I'll"}}]}

data: {"choices":[{"delta":{"content":" create"}}]}

data: {"choices":[{"delta":{"content":" a React"}}]}

data: [DONE]
```

**Non-Streaming Response**:
```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "I'll create a React button component for you:\n\n```jsx\nimport React from 'react';\n\nconst Button = ({ children, onClick, variant = 'primary' }) => {\n  return (\n    <button \n      className={`btn btn-${variant}`}\n      onClick={onClick}\n    >\n      {children}\n    </button>\n  );\n};\n\nexport default Button;\n```"
      }
    }
  ],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 95,
    "total_tokens": 120
  }
}
```

### Model Management

#### Get Available Models
```http
GET /api/models
```

**Response**:
```json
{
  "models": [
    {
      "id": "groq-llama-3.1-70b",
      "name": "Llama 3.1 70B",
      "provider": "groq",
      "access_groups": ["plus", "pro"],
      "context_length": 131072,
      "description": "Fast and capable model for general tasks"
    },
    {
      "id": "tesslate-uigen-v1",
      "name": "Tesslate UI Generator v1",
      "provider": "featherless",
      "access_groups": ["pro"],
      "context_length": 32768,
      "description": "Specialized model for UI/UX generation"
    }
  ]
}
```

### Payment Management

#### Get User Subscription
```http
GET /api/stripe/user
```

**Response**:
```json
{
  "subscription": {
    "planName": "plus",
    "subscriptionStatus": "active",
    "stripeCustomerId": "cus_...",
    "stripeSubscriptionId": "sub_...",
    "stripeProductId": "prod_...",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Handle Checkout Success
```http
GET /api/stripe/checkout?session_id=cs_...
```

**Description**: Internal endpoint for Stripe checkout completion

**Response**: Redirects to `/settings?upgraded=true`

#### Stripe Webhooks
```http
POST /api/stripe/webhook
Stripe-Signature: t=...,v1=...,v0=...
Content-Type: application/json

{
  "type": "customer.subscription.updated",
  "data": {
    "object": {
      "id": "sub_...",
      "customer": "cus_...",
      "status": "active"
    }
  }
}
```

**Response**:
```json
{
  "received": true
}
```

#### Cancel Signup
```http
POST /api/stripe/cancel-signup
Content-Type: application/json

{
  "reason": "changed_mind"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Signup cancelled successfully"
}
```

## Server Actions

Server Actions provide a type-safe way to handle form submissions and server-side operations.

### Payment Actions

#### Checkout Action
```typescript
import { checkoutAction } from '@/lib/payments/actions';

// In a form component
<form action={checkoutAction}>
  <input type="hidden" name="priceId" value="price_..." />
  <button type="submit">Upgrade to Plus</button>
</form>
```

#### Customer Portal Action
```typescript
import { customerPortalAction } from '@/lib/payments/actions';

<form action={customerPortalAction}>
  <button type="submit">Manage Subscription</button>
</form>
```

#### Cancel Signup Action
```typescript
import { cancelSignupAction } from '@/lib/payments/actions';

<form action={cancelSignupAction}>
  <button type="submit">Cancel Signup</button>
</form>
```

## Error Handling

### Standard Error Responses

All API endpoints return consistent error formats:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Common Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `UNAUTHORIZED` | No valid session | Sign in or refresh session |
| `FORBIDDEN` | Insufficient permissions | Upgrade subscription plan |
| `RATE_LIMITED` | Too many requests | Wait before retrying |
| `INVALID_MODEL` | Model not accessible | Check subscription plan |
| `VALIDATION_ERROR` | Invalid request data | Check request format |
| `PAYMENT_REQUIRED` | Feature requires payment | Upgrade subscription |

## Rate Limiting

### User-Based Limits

Rate limits are enforced per user based on subscription plan:

| Plan | Requests/Minute | Tokens/Minute |
|------|-----------------|---------------|
| Free | 20 | 20,000 |
| Plus | 100 | 100,000 |
| Pro | 500 | 500,000 |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Rate Limit Response

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMITED",
  "details": {
    "limit": 100,
    "remaining": 0,
    "resetTime": "2024-01-01T00:00:00.000Z"
  }
}
```

## Webhooks

### Stripe Webhooks

Configure webhooks in Stripe Dashboard to point to:
```
https://your-domain.com/api/stripe/webhook
```

**Required Events**:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

**Webhook Verification**:
```typescript
const sig = headers().get('stripe-signature');
const event = stripe.webhooks.constructEvent(
  body, 
  sig, 
  process.env.STRIPE_WEBHOOK_SECRET
);
```

## SDK Examples

### JavaScript/TypeScript Client

```typescript
class TesslateClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async chat(messages: Message[], model: string): Promise<Response> {
    return fetch(`${this.baseUrl}/api/proxy/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        selectedModelId: model,
        stream: true
      }),
      credentials: 'include' // Include session cookie
    });
  }

  async getChatHistory(): Promise<ChatSession[]> {
    const response = await fetch(`${this.baseUrl}/api/chat/history`, {
      credentials: 'include'
    });
    return response.json();
  }

  async getModels(): Promise<Model[]> {
    const response = await fetch(`${this.baseUrl}/api/models`, {
      credentials: 'include'
    });
    const data = await response.json();
    return data.models;
  }
}

// Usage
const client = new TesslateClient('https://your-domain.com');
const response = await client.chat([
  { role: 'user', content: 'Hello!' }
], 'groq-llama-3.1-70b');
```

### Python Client

```python
import requests
import json

class TesslateClient:
    def __init__(self, base_url, session_cookie):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.cookies.set('__session', session_cookie)

    def chat(self, messages, model):
        response = self.session.post(
            f"{self.base_url}/api/proxy/chat",
            json={
                "messages": messages,
                "selectedModelId": model,
                "stream": False
            }
        )
        return response.json()

    def get_chat_history(self):
        response = self.session.get(f"{self.base_url}/api/chat/history")
        return response.json()

# Usage
client = TesslateClient('https://your-domain.com', 'session-token')
result = client.chat([
    {"role": "user", "content": "Hello!"}
], "groq-llama-3.1-70b")
```

## Testing

### API Testing with curl

```bash
# Get chat history
curl -H "Cookie: __session=your-session-token" \
     https://your-domain.com/api/chat/history

# Send chat message
curl -X POST \
     -H "Content-Type: application/json" \
     -H "Cookie: __session=your-session-token" \
     -d '{"messages":[{"role":"user","content":"Hello"}],"selectedModelId":"groq-llama-3.1-70b"}' \
     https://your-domain.com/api/proxy/chat

# Get available models
curl -H "Cookie: __session=your-session-token" \
     https://your-domain.com/api/models
```

### Integration Testing

```typescript
import { test, expect } from '@playwright/test';

test('chat API flow', async ({ page }) => {
  // Sign in
  await page.goto('/sign-in');
  await page.fill('[data-testid=email]', 'test@example.com');
  await page.fill('[data-testid=password]', 'password');
  await page.click('[data-testid=sign-in-button]');

  // Send API request
  const response = await page.request.post('/api/proxy/chat', {
    data: {
      messages: [{ role: 'user', content: 'Hello' }],
      selectedModelId: 'groq-llama-3.1-70b'
    }
  });

  expect(response.ok()).toBeTruthy();
});
```

This comprehensive API documentation provides everything needed to integrate with and extend Tesslate Studio Lite's backend services.