import {
  EvaluationContext,
  Hook,
  InvalidContextError,
  JsonValue,
  Logger,
  OpenFeatureEventEmitter,
  Provider,
  ProviderFatalError,
  ProviderNotReadyError,
  ResolutionDetails,
  ServerProviderEvents,
} from '@openfeature/server-sdk';

import {
  BKTConfig,
  Bucketeer,
  defineBKTConfig,
  initializeBKTClient,
} from '@bucketeer/node-server-sdk';

import { SDK_VERSION } from './version';
import { evaluationContextToBKTUser } from './EvaluationContext';
import { toResolutionDetails, toResolutionDetailsJsonValue } from './BKTEvaluationDetailExt';

export const SOURCE_ID_OPEN_FEATURE_NODE = 104;
export const DEFAULT_WAIT_FOR_INITIALIZATION_TIMEOUT_MS = 60_000;

// implement the provider interface
export class BucketeerProvider implements Provider {
  private config: BKTConfig;
  private client?: Bucketeer;
  private initializationTimeoutMs: number;

  constructor(config: BKTConfig, options?: { initializationTimeoutMs?: number }) {
    // Use defineBKTConfig on the user-provided config to fill in defaults.
    // If BKTConfig is not created by defineConfig(),
    // it will quickly throw an error if apiKey, apiEndpoint, or featureTag are missing.
    // This gives faster feedback to the app developer.
    const overrideConfig = defineBKTConfig({
      ...config,
      // Add wrapper SDK version and wrapper source ID to the config
      // Override any user-provided values for these fields
      wrapperSdkVersion: SDK_VERSION,
      wrapperSdkSourceId: SOURCE_ID_OPEN_FEATURE_NODE,
    });
    this.config = overrideConfig;
    this.initializationTimeoutMs =
      options?.initializationTimeoutMs ?? DEFAULT_WAIT_FOR_INITIALIZATION_TIMEOUT_MS;
  }

  async resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    context: EvaluationContext,
    _logger: Logger,
  ): Promise<ResolutionDetails<boolean>> {
    const client = this.requiredBKTClient();
    const user = evaluationContextToBKTUser(context);
    const evaluationDetails = await client.booleanVariationDetails(user, flagKey, defaultValue);
    return toResolutionDetails(evaluationDetails);
  }

  async resolveStringEvaluation(
    flagKey: string,
    defaultValue: string,
    context: EvaluationContext,
    _logger: Logger,
  ): Promise<ResolutionDetails<string>> {
    const client = this.requiredBKTClient();
    const user = evaluationContextToBKTUser(context);
    const evaluationDetails = await client.stringVariationDetails(user, flagKey, defaultValue);
    return toResolutionDetails(evaluationDetails);
  }

  async resolveNumberEvaluation(
    flagKey: string,
    defaultValue: number,
    context: EvaluationContext,
    _logger: Logger,
  ): Promise<ResolutionDetails<number>> {
    const client = this.requiredBKTClient();
    const user = evaluationContextToBKTUser(context);
    const evaluationDetails = await client.numberVariationDetails(user, flagKey, defaultValue);
    return toResolutionDetails(evaluationDetails);
  }

  async resolveObjectEvaluation<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
    context: EvaluationContext,
    _logger: Logger,
  ): Promise<ResolutionDetails<T>> {
    const client = this.requiredBKTClient();
    const user = evaluationContextToBKTUser(context);
    const evaluationDetails = await client.objectVariationDetails(user, flagKey, defaultValue);
    // Accept all JsonValue types even null and primitive types
    // They are valid JsonValue and BKTValue can represent them
    return toResolutionDetailsJsonValue(evaluationDetails);
  }

  async initialize(context?: EvaluationContext) {
    if (!context) {
      throw new InvalidContextError('context is required');
    }
    const config = this.config;

    try {
      const client = initializeBKTClient(config);
      this.client = client;
      await client.waitForInitialization({ timeout: this.initializationTimeoutMs });
      this.events.emit(ServerProviderEvents.Ready);
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        // TimeoutError but The BKTClient SDK has been initialized
        this.events.emit(ServerProviderEvents.Ready);
      } else {
        this.events.emit(ServerProviderEvents.Error);
        throw new ProviderFatalError(`Failed to initialize Bucketeer client: ${error}`);
      }
    }
  }

  async onClose() {
    this.client?.destroy();
    this.client = undefined;
  }

  requiredBKTClient(): Bucketeer {
    const client = this.client;
    if (!client) {
      this.events.emit(ServerProviderEvents.Error);
      throw new ProviderNotReadyError('Bucketeer client is not initialized');
    }
    return client;
  }

  readonly events = new OpenFeatureEventEmitter();

  // Adds runtime validation that the provider is used with the expected SDK
  public readonly runsOn = 'server';
  readonly metadata = {
    name: 'Bucketeer Provider',
    version: SDK_VERSION,
  } as const;
  // Optional provider managed hooks
  hooks?: Hook[];
}
