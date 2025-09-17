import { OpenFeature } from '@openfeature/server-sdk';
import { BucketeerProvider } from '@bucketeer/openfeature-node-server-sdk';
import { bucketeerConfig, defaultContext } from './config/bucketeer-config.js';

async function main() {
  console.log('🌟 Bucketeer OpenFeature SDK Example Application\n');

  try {
    // Initialize the provider
    const provider = new BucketeerProvider(bucketeerConfig, {
      initializationTimeoutMs: 30000, // 30 seconds timeout
    });

    // Set the provider and wait for initialization
    console.log('⏳ Initializing Bucketeer provider...');
    await OpenFeature.setProviderAndWait(provider);
    console.log('✅ Provider initialized successfully!\n');

    // Get a client instance
    const client = OpenFeature.getClient('example-app');

    // Demonstrate basic flag evaluation
    console.log('🏃‍♂️ Running flag evaluations...\n');

    // Feature flags evaluation with detailed results
    const booleanDetails = await client.getBooleanDetails('feature_toggle', false, defaultContext);
    console.log('Boolean Flag Details:', {
      value: booleanDetails.value,
      reason: booleanDetails.reason,
      variant: booleanDetails.variant,
    });

    const stringDetails = await client.getStringDetails(
      'welcome_message',
      'Welcome!',
      defaultContext,
    );
    console.log('String Flag Details:', {
      value: stringDetails.value,
      reason: stringDetails.reason,
      variant: stringDetails.variant,
    });

    console.log('\n✨ Example completed successfully!');
  } catch (error) {
    console.error('❌ Application error:', error);
    process.exit(1);
  } finally {
    // Clean up
    await OpenFeature.close();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await OpenFeature.close();
  process.exit(0);
});

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
