# LiteLLM Integration Architecture

## Overview

LiteLLM serves as the core API gateway for all LLM interactions in Tesslate Studio Lite. It provides a unified interface to multiple AI providers, sophisticated rate limiting, user-based access control, and comprehensive usage tracking. The integration follows a microservices architecture with dedicated infrastructure for scalability and reliability.

## Architecture Components

### Infrastructure Layout

```mermaid
graph TB
    A[Next.js App] --> B[LiteLLM Proxy]
    B --> C[Multiple LLM Providers]
    B --> D[LiteLLM Database]
    B --> E[Redis Cache]
    A --> F[App Database]
    
    C --> G[Groq]
    C --> H[Llama Provider]
    C --> I[Featherless AI]
    
    subgraph "Docker Network"
        A
        B
        D
        E
        F
    end
```

### Container Configuration

**Docker Compose Setup** (`docker-compose.yml`):
```yaml
services:
  nextjs-app:
    build: .
    container_name: tesslate_nextjs_app
    ports: ["3001:3000"]
    environment:
      POSTGRES_URL: "postgresql://user:password@postgres-app:5432/tesslate_db"
      LITELLM_PROXY_URL: "http://litellm-proxy:4000"
    depends_on: [postgres-app, litellm-proxy]

  litellm-proxy:
    image: ghcr.io/berriai/litellm-database:main-stable
    container_name: tesslate_litellm_proxy
    ports: ["4000:4000"]
    command: ["--config", "/app/config.yaml", "--port", "4000"]
    environment:
      DATABASE_URL: "postgresql://user:password@postgres-litellm:5432/litellm_db"
      LITELLM_MASTER_KEY: ${LITELLM_MASTER_KEY}
      REDIS_HOST: "redis"
      REDIS_PASSWORD: ""
      REDIS_PORT: 6379
    volumes: ["./litellm.config.yaml:/app/config.yaml"]
    depends_on: [postgres-litellm, redis]

  redis:
    image: redis:7-alpine
    container_name: tesslate_redis
    ports: ["6379:6379"]

  postgres-litellm:
    image: postgres:15
    container_name: tesslate_postgres_litellm
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: litellm_db
    ports: ["54323:5432"]
    volumes: ["postgres_litellm_data:/var/lib/postgresql/data"]
```

## Model Configuration

### Provider Setup

**LiteLLM Configuration** (`litellm.config.yaml`):
```yaml
model_list:
  # Groq Models (Fast Inference)
  - model_name: groq-llama-3.1-405b
    litellm_params:
      model: groq/llama-3.1-405b-reasoning-preview
      api_key: os.environ/GROQ_API_KEY
      rpm: 30
      tpm: 6000
    model_info:
      access_groups: ["pro"]
      
  - model_name: groq-llama-3.1-70b
    litellm_params:
      model: groq/llama-3.1-70b-versatile
      api_key: os.environ/GROQ_API_KEY
      rpm: 30
      tpm: 6000
    model_info:
      access_groups: ["plus"]

  # Tesslate Custom Models (via Featherless AI)
  - model_name: tesslate-uigen-v1
    litellm_params:
      model: featherless/tesslate/uigen-v1
      api_base: https://api.featherless.ai/v1
      api_key: os.environ/FEATHERLESS_API_KEY
      rpm: 60
      tpm: 120000
    model_info:
      access_groups: ["pro"]

  # Llama Provider Models
  - model_name: llama-4-maverick
    litellm_params:
      model: llama/llama-4-maverick-7b
      api_key: os.environ/LLAMA_API_KEY
      rpm: 100
      tpm: 200000
    model_info:
      access_groups: ["pro"]

# Router Configuration
router_settings:
  routing_strategy: latency-based-routing
  allowed_fails: 3
  cooldown_time: 60
  num_retries: 2
  timeout: 600
  enable_pre_call_checks: true

# Database Integration
general_settings:
  store_model_in_db: true
  store_prompts_in_spend_logs: true
  database_connection_pool_limit: 20
```

### Access Control Matrix

| Plan | Models Available | RPM Limit | TPM Limit |
|------|------------------|-----------|-----------|
| Free | groq-llama-3.1-8b, basic models | 20 | 20,000 |
| Plus | Free + groq-llama-3.1-70b, advanced models | 100 | 100,000 |
| Pro | All models including tesslate-uigen-v1, llama-4-maverick | 500 | 500,000 |

## Virtual Key Management

### Key Lifecycle

**Key Generation** (`/lib/litellm/management.ts`):
```typescript
export async function createUserKey(user: User, planName: PlanName = 'free'): Promise<string> {
  const planDetails = plans[planName];
  
  try {
    const response = await litellmApi.generateKey({
      user_id: user.id.toString(),
      models: planDetails.models,
      rpm_limit: planDetails.rpm,
      tpm_limit: planDetails.tpm,
      budget_id: `budget_${user.id}`,
      metadata: {
        user_email: user.email,
        plan_name: planName,
        created_at: new Date().toISOString(),
      },
    });

    // Store in app database
    await db.update(users)
      .set({ litellmVirtualKey: response.key })
      .where(eq(users.id, user.id));

    console.log(`✅ Created LiteLLM key for user ${user.id} with plan ${planName}`);
    return response.key;
  } catch (error) {
    console.error(`❌ Failed to create LiteLLM key for user ${user.id}:`, error);
    throw error;
  }
}
```

**Key Updates** (Triggered by subscription changes):
```typescript
export async function updateUserKeyForPlan(userId: string, planName: PlanName): Promise<void> {
  const user = await getUserById(userId);
  const planDetails = plans[planName];

  if (!user.litellmVirtualKey) {
    await createUserKey(user, planName);
    return;
  }

  try {
    await litellmApi.updateKey(user.litellmVirtualKey, {
      models: planDetails.models,
      rpm_limit: planDetails.rpm,
      tpm_limit: planDetails.tpm,
      metadata: {
        plan_name: planName,
        updated_at: new Date().toISOString(),
      },
    });

    console.log(`✅ Updated LiteLLM key for user ${userId} to plan ${planName}`);
  } catch (error) {
    console.error(`❌ Failed to update LiteLLM key for user ${userId}:`, error);
    throw error;
  }
}
```

### API Key Security

**Authentication Flow**:
1. User authenticates via Firebase
2. Server verifies session and retrieves user's virtual key
3. Virtual key used for all LiteLLM requests
4. LiteLLM enforces user-specific rate limits and model access

**Security Features**:
- Virtual keys are user-specific and non-transferable
- Keys are stored securely in the app database
- Rate limiting prevents abuse
- Model access controlled by subscription plan
- Full audit trail of usage

## Request Flow Architecture

### Chat Request Processing

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API Route
    participant P as Prompt Manager
    participant L as LiteLLM
    participant M as Model Provider

    U->>F: Send chat message
    F->>A: POST /api/proxy/chat
    A->>A: Validate user & session
    A->>P: Get system prompts
    P-->>A: Return dynamic prompts
    A->>L: Send request with virtual key
    L->>L: Validate key & check limits
    L->>M: Route to appropriate model
    M-->>L: Stream response
    L-->>A: Stream response
    A-->>F: Stream to client
    F-->>U: Display response
```

**Chat Proxy Implementation** (`/app/api/proxy/chat/route.ts`):
```typescript
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const user = await getUser();
    if (!user || !user.litellmVirtualKey) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 2. Parse request
    const { messages, selectedModelId } = await request.json();

    // 3. System prompt injection
    const systemPrompts = getSystemPrompts();
    const finalMessages = [
      { role: 'system', content: systemPrompts.join('\n') },
      ...messages
    ];

    // 4. LiteLLM request
    const liteLLMResponse = await generateChatCompletion(
      user.litellmVirtualKey,
      {
        model: selectedModelId,
        messages: finalMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 4000,
      }
    );

    // 5. Stream response
    return new Response(liteLLMResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[API Proxy Error]', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

### Dynamic Prompt System

**Prompt Manager** (`/lib/prompt-manager.ts`):
```typescript
export function getSystemPrompts(): string[] {
  const basePrompts = [
    "You are Tessa, Tesslate's advanced AI assistant.",
    "You excel at creating interactive web applications and explaining complex topics.",
    "When generating code, use modern best practices and include proper error handling.",
  ];

  const codePrompts = [
    "For web applications, prefer React with modern hooks.",
    "Use Tailwind CSS for styling when possible.",
    "Include responsive design considerations.",
    "Add accessibility features like ARIA labels.",
  ];

  const uiPrompts = [
    "Create engaging and intuitive user interfaces.",
    "Use consistent design patterns and color schemes.",
    "Ensure mobile-first responsive design.",
    "Include hover states and smooth transitions.",
  ];

  return [...basePrompts, ...codePrompts, ...uiPrompts];
}
```

## Rate Limiting & Monitoring

### Rate Limit Enforcement

LiteLLM enforces rate limits at multiple levels:

**User-Level Limits**:
```typescript
export const plans: Record<PlanName, PlanDetails> = {
  free: {
    models: ["groq-llama-3.1-8b", "basic-chat"],
    rpm: 20,    // 20 requests per minute
    tpm: 20000, // 20,000 tokens per minute
  },
  plus: {
    models: ["groq-llama-3.1-70b", "groq-llama-3.1-8b", "advanced-chat"],
    rpm: 100,
    tpm: 100000,
  },
  pro: {
    models: ["tesslate-uigen-v1", "llama-4-maverick", "all-models"],
    rpm: 500,
    tpm: 500000,
  },
};
```

**Model-Level Limits** (defined in `litellm.config.yaml`):
- Individual RPM/TPM limits per model
- Provider-specific rate limiting
- Automatic failover to backup models

### Usage Tracking

**Database Logging**:
- Every request logged with user ID, model, tokens used
- Spend tracking per user and organization
- Detailed prompt logging for debugging
- Real-time usage dashboards available

**Monitoring Endpoints**:
```http
GET  /health              # Health check
GET  /metrics             # Prometheus metrics
GET  /usage/{user_id}     # User-specific usage stats
POST /admin/keys          # Key management (admin only)
```

## Error Handling & Reliability

### Multi-Level Fallbacks

**Router Configuration**:
```yaml
router_settings:
  routing_strategy: latency-based-routing
  allowed_fails: 3          # Allow 3 failures before switching
  cooldown_time: 60         # 60 second cooldown after failures
  num_retries: 2            # Retry failed requests twice
  timeout: 600              # 10 minute timeout for long requests
  enable_pre_call_checks: true
```

**Application-Level Error Handling**:
```typescript
export async function generateChatCompletion(
  apiKey: string, 
  params: ChatCompletionParams
): Promise<Response> {
  const maxRetries = 3;
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${LITELLM_PROXY_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`LiteLLM Error: ${response.status} - ${errorData.error || response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
      }
    }
  }

  throw lastError!;
}
```

### Health Monitoring

**Health Check Implementation**:
```typescript
export async function checkLiteLLMHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${LITELLM_PROXY_URL}/health`, {
      method: 'GET',
      timeout: 5000,
    });
    return response.ok;
  } catch (error) {
    console.error('LiteLLM health check failed:', error);
    return false;
  }
}
```

## Development & Testing

### Local Development Setup

**Environment Configuration**:
```env
# LiteLLM Configuration
LITELLM_MASTER_KEY=sk-local-development-key
LITELLM_PROXY_URL=http://localhost:4000

# Provider API Keys
GROQ_API_KEY=gsk_...
FEATHERLESS_API_KEY=...
LLAMA_API_KEY=...
```

**Docker Development**:
```bash
# Start all services
docker-compose up --build

# Check LiteLLM logs
docker logs tesslate_litellm_proxy -f

# Test API connectivity
curl http://localhost:4000/health
```

### Testing Virtual Keys

**Key Generation Test**:
```typescript
// Test script for key management
import { createUserKey, updateUserKeyForPlan } from '@/lib/litellm/management';

async function testKeyManagement() {
  const testUser = { id: 'test-user', email: 'test@example.com' };
  
  // Create key
  const key = await createUserKey(testUser, 'free');
  console.log('Created key:', key);
  
  // Update to plus plan
  await updateUserKeyForPlan(testUser.id, 'plus');
  console.log('Updated to plus plan');
  
  // Test API call
  const response = await generateChatCompletion(key, {
    model: 'groq-llama-3.1-70b',
    messages: [{ role: 'user', content: 'Hello!' }],
    stream: false,
  });
  
  console.log('API call successful:', response.ok);
}
```

## Production Deployment

### Scaling Considerations

**Container Resources**:
```yaml
litellm-proxy:
  deploy:
    resources:
      limits:
        memory: 2G
        cpus: '1.0'
      reservations:
        memory: 1G
        cpus: '0.5'
  restart: unless-stopped
```

**Database Optimization**:
```sql
-- Indexes for performance
CREATE INDEX idx_litellm_keys_user_id ON litellm_keys(user_id);
CREATE INDEX idx_spend_logs_user_id_created ON spend_logs(user_id, created_at);
CREATE INDEX idx_spend_logs_model ON spend_logs(model);
```

### Monitoring & Alerting

**Key Metrics to Monitor**:
- Request latency per model
- Error rates by provider
- Rate limit violations
- Token usage trends
- Database connection pool usage

**Alert Conditions**:
- LiteLLM proxy downtime > 1 minute
- Error rate > 5% for 5 minutes
- Database connections > 80% of pool
- Individual user exceeding rate limits

### Security Best Practices

**API Key Management**:
- Rotate `LITELLM_MASTER_KEY` regularly
- Use separate keys for development/staging/production
- Monitor for unauthorized key usage
- Implement key expiration policies

**Network Security**:
- LiteLLM proxy not directly exposed to internet
- All traffic routed through Next.js API routes
- Redis and databases in private network
- TLS encryption for all external communications

## Troubleshooting Guide

### Common Issues

**1. Virtual Key Creation Failures**
```bash
# Check LiteLLM proxy logs
docker logs tesslate_litellm_proxy | grep ERROR

# Verify master key
curl -H "Authorization: Bearer $LITELLM_MASTER_KEY" http://localhost:4000/health

# Check database connectivity
docker exec tesslate_postgres_litellm psql -U user -d litellm_db -c "\dt"
```

**2. Rate Limit Issues**
```typescript
// Check user's current limits
const userInfo = await litellmApi.getUserInfo(virtualKey);
console.log('Current limits:', userInfo.rpm_limit, userInfo.tpm_limit);

// Reset rate limit counters (admin only)
await litellmApi.resetUserLimits(userId);
```

**3. Model Access Denied**
```typescript
// Verify user's plan and model access
const user = await getUserById(userId);
const planDetails = plans[user.planName];
console.log('Available models:', planDetails.models);

// Check if model is in user's allowed list
const hasAccess = planDetails.models.includes(requestedModel);
```

### Debug Commands

```bash
# View LiteLLM configuration
docker exec tesslate_litellm_proxy cat /app/config.yaml

# Check Redis connection
docker exec tesslate_redis redis-cli ping

# Monitor real-time requests
docker logs tesslate_litellm_proxy -f | grep "POST /chat/completions"

# Database query for user usage
docker exec tesslate_postgres_litellm psql -U user -d litellm_db -c "
  SELECT user_id, model, COUNT(*) as requests, SUM(total_tokens) as tokens 
  FROM spend_logs 
  WHERE created_at > NOW() - INTERVAL '1 hour' 
  GROUP BY user_id, model;
"
```

This comprehensive LiteLLM integration provides a robust, scalable foundation for multi-provider AI model access with sophisticated user management and monitoring capabilities.