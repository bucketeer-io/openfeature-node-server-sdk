import {
  ErrorCode,
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
  StandardResolutionReasons,
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

  /**
   * Resolves an object or array value from a feature flag.
   *
   * ⚠️ STRICT TYPE VALIDATION:
   * - This method ONLY supports object types (JSON objects and arrays).
   * - Primitive types (string, number, boolean) are explicitly rejected to ensure type safety.
   * - For primitive types, use the corresponding methods on the OpenFeature Client: `getBooleanValue`, `getStringValue`, `getNumberValue`, or their `Details` variants.
   *
   * ⚠️ NESTED TYPE CAVEAT:
   * - While the top-level type (Array vs Object) is validated, the internal structure
   *   (e.g., array element types or object property keys/types) cannot be validated at the provider level due to type erasure.
   * - Always use additional runtime validation (type guards, Zod, etc.) before accessing nested properties.
   *
   * @example
   * // Provider validates: result is array, default is array ✓
   * const result = client.getObjectDetails<string[]>(flagKey, ['default'])
   *
   * // But provider CANNOT validate element types ⚠️
   * // Use type guard before accessing:
   * if (Array.isArray(result.value) && result.value.every(x => typeof x === 'string')) {
   *   result.value.forEach(str => str.toUpperCase()) // Now safe
   * }
   */
  async resolveObjectEvaluation<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
    context: EvaluationContext,
    _logger: Logger,
  ): Promise<ResolutionDetails<T>> {
    // Early guard: Verify that defaultValue itself is an object or array
    // This enforces the "ONLY supports object types" contract even if the caller
    // attempts to pass a primitive as the default value.
    if (defaultValue === null || typeof defaultValue !== 'object') {
      return wrongTypeResult(
        defaultValue,
        `Default value must be an object or array but got ${
          defaultValue === null ? 'null' : typeof defaultValue
        }`,
      );
    }

    const client = this.requiredBKTClient();
    const user = evaluationContextToBKTUser(context);
    const evaluationDetails = await client.objectVariationDetails(user, flagKey, defaultValue);

    // Step 1: Check for null (special case where typeof null === 'object')
    if (evaluationDetails.variationValue === null) {
      return wrongTypeResult(defaultValue, `Expected object but got null`);
    }

    // Step 2: Verify the value is an object type (object or array)
    if (typeof evaluationDetails.variationValue === 'object') {
      // Step 3: Distinguish between arrays and plain objects
      // Note: At this point we've validated the top-level type (array vs object).
      // However, DUE TO TYPE ERASURE, we cannot validate:
      // - Array element types (e.g., string[] vs number[])
      // - Object property shapes (e.g., {name: string} vs {age: number})
      const resultIsJsonArray = Array.isArray(evaluationDetails.variationValue);
      const defaultIsJsonArray = Array.isArray(defaultValue);

      // Step 4: Enforce type consistency between default and returned value
      if (resultIsJsonArray !== defaultIsJsonArray) {
        return wrongTypeResult(
          defaultValue,
          `Expected ${defaultIsJsonArray ? 'array' : 'object'} but got ${
            resultIsJsonArray ? 'array' : 'object'
          }`,
        );
      }

      // Top-level structure is consistent - return the result
      return toResolutionDetailsJsonValue(evaluationDetails);
    }

    // Step 5: Reject all primitive types (string, number, boolean)
    // This prevents runtime crashes when users specify a generic <T> that doesn't
    // match the actual primitive value returned by the backend.
    return wrongTypeResult(
      defaultValue,
      `Expected object but got ${typeof evaluationDetails.variationValue}`,
    );
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

export function wrongTypeResult<T>(value: T, errorMessage: string): ResolutionDetails<T> {
  return {
    value,
    reason: StandardResolutionReasons.ERROR,
    errorCode: ErrorCode.TYPE_MISMATCH,
    errorMessage,
  };
}
