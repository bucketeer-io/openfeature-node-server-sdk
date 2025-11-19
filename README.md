# Bucketeer - OpenFeature Node.js Server Provider

This is the official Node.js server-side OpenFeature provider for accessing your feature flags with [Bucketeer](https://bucketeer.io/).

[Bucketeer](https://bucketeer.io) is an open-source platform created by [CyberAgent](https://www.cyberagent.co.jp/en/) to help teams make better decisions, reduce deployment lead time and release risk through feature flags. Bucketeer offers advanced features like dark launches and staged rollouts that perform limited releases based on user attributes, devices, and other segments.

In conjunction with the [OpenFeature Server SDK](https://openfeature.dev/docs/reference/concepts/provider) you will be able to evaluate your feature flags in your Node.js server applications.

> [!WARNING]
> This is a beta version. Breaking changes may be introduced before general release.

For documentation related to flags management in Bucketeer, refer to the [Bucketeer documentation website](https://docs.bucketeer.io/sdk/server-side/node-js).

## Installation

```bash
npm install @bucketeer/openfeature-node-server-sdk @openfeature/server-sdk @bucketeer/node-server-sdk
```

**Note:** This package requires `@openfeature/server-sdk` and `@bucketeer/node-server-sdk` as peer dependencies.

## Usage

### Initialize the provider

Bucketeer provider needs to be created and then set in the global OpenFeature instance.

```typescript
import { OpenFeature } from '@openfeature/server-sdk';
import { BucketeerProvider, defineBKTConfig } from '@bucketeer/openfeature-node-server-sdk';

const config = defineBKTConfig({
  apiKey: 'BUCKETEER_API_KEY',
  apiEndpoint: 'BUCKETEER_API_ENDPOINT',
  featureTag: 'FEATURE_TAG',
  appVersion: '1.2.3',
});

// Initialize the provider
const provider = new BucketeerProvider(config);

// Set the provider and wait for initialization
await OpenFeature.setProviderAndWait(provider);
```

See our [documentation](https://docs.bucketeer.io/sdk/server-side/node-js) for more SDK configuration options.

The evaluation context allows the client to specify contextual data that Bucketeer uses to evaluate the feature flags.

The `targetingKey` is the user ID (Unique ID) and cannot be empty.

### Evaluation Context

In server-side applications, evaluation context is typically provided per request rather than set globally. This allows for user-specific flag evaluations based on request data.

```typescript
const client = OpenFeature.getClient();

// Define evaluation context per request/user
const evaluationContext = {
  targetingKey: 'user-123', // Required: unique user identifier
  email: 'user@example.com', // User attributes for targeting
  plan: 'premium',
  region: 'us-east-1',
  timestamp: new Date().toISOString(),
};

// Evaluate flags with context
const featureEnabled = await client.getBooleanValue('new-feature', false, evaluationContext);
```

For applications that need to share some common context across all evaluations, you can set client-level context:

```typescript
const client = OpenFeature.getClient();

// Set common context at the client level (e.g., application version)
client.setContext({
  version: process.env.APP_VERSION,
  environment: process.env.NODE_ENV,
});

// Per-request context will be merged with client context
const requestContext = {
  targetingKey: req.user.id,
  email: req.user.email,
  plan: req.user.plan,
};

const result = await client.getBooleanValue('feature-flag', false, requestContext);
```

### Evaluate a feature flag

After the provider is set and ready, you can evaluate feature flags using the OpenFeature client. Always provide evaluation context for each evaluation.

```typescript
const client = OpenFeature.getClient();

// Define evaluation context (typically per request)
const context = {
  targetingKey: 'user-123', // Required
  email: 'user@example.com',
  plan: 'premium',
};

// boolean flag
const booleanValue = await client.getBooleanValue('my-feature-flag', false, context);

// string flag
const stringValue = await client.getStringValue('my-feature-flag', 'default-value', context);

// number flag
const numberValue = await client.getNumberValue('my-feature-flag', 0, context);

// object flag
const objectValue = await client.getObjectValue('my-feature-flag', {}, context);

// Get detailed evaluation results
const booleanDetails = await client.getBooleanDetails('my-feature-flag', false, context);
console.log(booleanDetails.value, booleanDetails.reason, booleanDetails.variant);
```

### Express.js Example

Here's how you might use this in an Express.js application:

```typescript
import express from 'express';
import { OpenFeature } from '@openfeature/server-sdk';
import { BucketeerProvider, defineBKTConfig } from '@bucketeer/openfeature-node-server-sdk';

const app = express();
const client = OpenFeature.getClient();

app.get('/api/features', async (req, res) => {
  // Create evaluation context from request
  // In a real app, you'd get the user ID from your auth system
  const userId = (req.headers['x-user-id'] as string) || 'anonymous';
  const userEmail = req.headers['x-user-email'] as string;

  const context = {
    targetingKey: userId,
    email: userEmail,
    userAgent: req.get('User-Agent'),
    ipAddress: req.ip,
  };

  try {
    const features = {
      newDashboard: await client.getBooleanValue('new-dashboard', false, context),
      welcomeMessage: await client.getStringValue('welcome-message', 'Welcome!', context),
      maxItems: await client.getNumberValue('max-items-per-page', 10, context),
    };

    res.json(features);
  } catch (error) {
    console.error('Feature flag evaluation error:', error);
    res.status(500).json({ error: 'Failed to evaluate features' });
  }
});

// Alternative example with authentication middleware
interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    email: string;
    plan: string;
  };
}

app.get('/api/user-features', async (req: AuthenticatedRequest, res) => {
  // Assuming you have authentication middleware that sets req.user
  const context = {
    targetingKey: req.user?.id || 'anonymous',
    email: req.user?.email,
    plan: req.user?.plan || 'free',
    userAgent: req.get('User-Agent'),
    ipAddress: req.ip,
  };

  try {
    const features = {
      premiumFeature: await client.getBooleanValue('premium-feature', false, context),
      dashboardTheme: await client.getStringValue('dashboard-theme', 'default', context),
    };

    res.json(features);
  } catch (error) {
    console.error('Feature flag evaluation error:', error);
    res.status(500).json({ error: 'Failed to evaluate features' });
  }
});
```

### Complete Example

Here's a complete example of how to use the Bucketeer OpenFeature Node.js server provider:

```typescript
import { OpenFeature } from '@openfeature/server-sdk';
import { BucketeerProvider, defineBKTConfig } from '@bucketeer/openfeature-node-server-sdk';

async function main() {
  try {
    // Configure Bucketeer
    const config = defineBKTConfig({
      apiKey: process.env.BUCKETEER_API_KEY!,
      apiEndpoint: process.env.BUCKETEER_API_ENDPOINT!,
      featureTag: process.env.BUCKETEER_FEATURE_TAG!,
      appVersion: '1.0.0',
    });

    // Initialize provider with optional timeout
    const provider = new BucketeerProvider(config, {
      initializationTimeoutMs: 30000, // 30 seconds
    });

    // Set provider and wait for initialization
    await OpenFeature.setProviderAndWait(provider);

    // Get client
    const client = OpenFeature.getClient('my-app');

    // Simulate user request - define evaluation context per user/request
    const userContext = {
      targetingKey: 'user-123',
      email: 'user@example.com',
      plan: 'premium',
      timestamp: new Date().toISOString(),
    };

    // Evaluate feature flags with context
    const isNewFeatureEnabled = await client.getBooleanValue('new-feature', false, userContext);
    const welcomeMessage = await client.getStringValue('welcome-message', 'Welcome!', userContext);
    const maxItems = await client.getNumberValue('max-items', 10, userContext);

    console.log(`New feature enabled: ${isNewFeatureEnabled}`);
    console.log(`Welcome message: ${welcomeMessage}`);
    console.log(`Max items: ${maxItems}`);

    // Example of different user context
    const anotherUserContext = {
      targetingKey: 'user-456',
      email: 'another@example.com',
      plan: 'free',
    };

    const featureForAnotherUser = await client.getBooleanValue(
      'new-feature',
      false,
      anotherUserContext,
    );
    console.log(`Feature for another user: ${featureForAnotherUser}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Clean up when your application shuts down
    await OpenFeature.close();
  }
}

main();
```

## Contributing

We would ❤️ for you to contribute to Bucketeer and help improve it! Anyone can use and enjoy it!

Please follow our contribution guide [here](https://docs.bucketeer.io/contribution-guide/).

## Development

### Environment

- Node.js
  - check `./.nvmrc` for the required version
- yarn
  - package manager

You need a `.env` file to provide API secrets for testing.
Copy `.env.example` and rename it to `.env`, then update it with your Bucketeer credentials.

### Commands

```bash
# Install dependencies
yarn install

# Build the project
yarn build

# Run tests
yarn test

# Run end-to-end tests
yarn test:e2e

# Lint code
yarn lint

# Format code
yarn prettier:fix
```

### Example Application

Check the `example/` directory for a complete Express.js application demonstrating how to use this SDK.

```bash
cd example
npm install
npm run build
npm run dev
```

## License

Apache License 2.0, see [LICENSE](https://github.com/bucketeer-io/openfeature-node-server-sdk/blob/main/LICENSE).
