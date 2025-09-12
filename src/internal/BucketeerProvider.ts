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
} from 'bkt-node-server-sdk';

import { SDK_VERSION } from './version';
import { evaluationContextToBKTUser } from './EvaluationContext';
import {
  toResolutionDetails,
  toResolutionDetailsJsonValue,
} from './BKTEvaluationDetailExt';

export const SOURCE_ID_OPEN_FEATURE_NODE = 104;

// implement the provider interface
export class BuckeeterProvider implements Provider {
  private config: BKTConfig;
  private client?: Bucketeer;

  constructor(config: BKTConfig) {
    const overrideConfig = defineBKTConfig({
      ...config,
      wrapperSdkVersion: SDK_VERSION,
      wrapperSdkSourceId: SOURCE_ID_OPEN_FEATURE_NODE,
    });
    this.config = overrideConfig;
  }

  async resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    context: EvaluationContext,
    _logger: Logger,
  ): Promise<ResolutionDetails<boolean>> {
    const client = this.requiredBKTClient();
    const user = evaluationContextToBKTUser(context);
    const evaluationDetails = await client.booleanVariationDetails(
      user,
      flagKey,
      defaultValue,
    );
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
    const evaluationDetails = await client.stringVariationDetails(
      user,
      flagKey,
      defaultValue,
    );
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
    const evaluationDetails = await client.numberVariationDetails(
      user,
      flagKey,
      defaultValue,
    );
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
    const evaluationDetails = await client.objectVariationDetails(
      user,
      flagKey,
      defaultValue,
    );
    if (typeof evaluationDetails.variationValue === 'object') {
      return toResolutionDetailsJsonValue(evaluationDetails);
    }
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
      await client.waitForInitialization({ timeout: 30_000 });
      this.client = client;
      this.events.emit(ServerProviderEvents.Ready);
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        // TimeoutError but The BKTClient SDK has been initialized
        this.events.emit(ServerProviderEvents.Ready);
      } else {
        this.events.emit(ServerProviderEvents.Error);
        throw new ProviderFatalError(
          `Failed to initialize Bucketeer client: ${error}`,
        );
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
    name: 'Buckeeter Provider',
  } as const;
  // Optional provider managed hooks
  hooks?: Hook[];
}

export function wrongTypeResult<T>(
  value: T,
  errorMessage: string,
): ResolutionDetails<T> {
  return {
    value,
    reason: StandardResolutionReasons.ERROR,
    errorCode: ErrorCode.TYPE_MISMATCH,
    errorMessage,
  };
}
