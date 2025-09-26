import {
  BucketeerProvider,
  DEFAULT_WAIT_FOR_INITIALIZATION_TIMEOUT_MS,
  SOURCE_ID_OPEN_FEATURE_NODE,
  wrongTypeResult,
} from '../src/internal/BucketeerProvider';
import {
  BKTConfig,
  BKTEvaluationDetails,
  BKTValue,
  Bucketeer,
  defineBKTConfig,
  initializeBKTClient,
} from 'bkt-node-server-sdk';
import {
  EvaluationContext,
  ErrorCode,
  InvalidContextError,
  ProviderFatalError,
  ProviderNotReadyError,
  StandardResolutionReasons,
  ServerProviderEvents,
  ResolutionDetails,
} from '@openfeature/server-sdk';
import { SDK_VERSION } from '../src/internal/version';
import { InternalConfig } from 'bkt-node-server-sdk/lib/internalConfig';

jest.mock('bkt-node-server-sdk', () => {
  const actualImpl = jest.requireActual('bkt-node-server-sdk');
  return {
    ...actualImpl,
    initializeBKTClient: jest.fn(),
    Bucketeer: jest.fn(),
  };
});

describe('BucketeerProvider', () => {
  let provider: BucketeerProvider;
  let mockClient: jest.Mocked<Bucketeer>;
  let userConfig: BKTConfig;
  let mockContext: EvaluationContext;

  beforeEach(() => {
    jest.clearAllMocks();

    userConfig = defineBKTConfig({
      apiKey: 'test-api-key',
      apiEndpoint: 'http://test-endpoint',
      featureTag: 'test-tag',
      eventsFlushInterval: 30_000,
      eventsMaxQueueSize: 100,
      cachePollingInterval: 60_000,
      appVersion: '1.0.1',
      logger: console,
      enableLocalEvaluation: false,
    });

    mockContext = {
      targetingKey: 'test-user',
      email: 'test@example.com',
      role: 'tester',
    };

    mockClient = {
      booleanVariationDetails: jest.fn(),
      stringVariationDetails: jest.fn(),
      numberVariationDetails: jest.fn(),
      objectVariationDetails: jest.fn(),
      waitForInitialization: jest.fn(),
      destroy: jest.fn(),
      getBoolVariation: jest.fn(),
      getStringVariation: jest.fn(),
      getNumberVariation: jest.fn(),
      getJsonVariation: jest.fn(),
      track: jest.fn(),
      booleanVariation: jest.fn(),
      stringVariation: jest.fn(),
      numberVariation: jest.fn(),
      objectVariation: jest.fn(),
      getBuildInfo: jest.fn(),
    };

    (initializeBKTClient as jest.Mock).mockReturnValue(mockClient);
    provider = new BucketeerProvider(userConfig, { initializationTimeoutMs: 5000 });
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(provider.metadata.name).toBe('Bucketeer Provider');
      expect(provider.runsOn).toBe('server');
    });
  });

  describe('initialization', () => {
    it('should successfully initialize the provider', async () => {
      const emitSpy = jest.spyOn(provider.events, 'emit');
      await provider.initialize(mockContext);
      // Even user config did not include wrapperSdkVersion and wrapperSourceId, they should be set internally
      const internalConfig = {
        ...userConfig,
        sdkVersion: SDK_VERSION,
        sourceId: SOURCE_ID_OPEN_FEATURE_NODE,
      } satisfies InternalConfig;
      expect(initializeBKTClient).toHaveBeenCalledWith(expect.objectContaining(internalConfig));
      // Verify that SDK version and source ID were overridden with correct values
      const { sdkVersion, sourceId } = internalConfig as unknown as InternalConfig;
      expect(sdkVersion).toBe(SDK_VERSION);
      expect(sourceId).toBe(SOURCE_ID_OPEN_FEATURE_NODE);
      expect(mockClient.waitForInitialization).toHaveBeenCalledWith({
        timeout: 5000,
      });
      expect(emitSpy).toHaveBeenCalledWith(ServerProviderEvents.Ready);
    });

    it('should emit ready event even on timeout error', async () => {
      (mockClient.waitForInitialization as jest.Mock).mockImplementationOnce(() => {
        throw Object.assign(new Error('Timeout'), { name: 'TimeoutError' });
      });
      const emitSpy = jest.spyOn(provider.events, 'emit');
      await provider.initialize(mockContext);
      expect(mockClient.waitForInitialization).toHaveBeenCalledWith({
        timeout: 5000,
      });
      expect(emitSpy).toHaveBeenCalledWith(ServerProviderEvents.Ready);
      expect(provider['client']).toBe(mockClient);
    });

    it('should emit error and throw ProviderFatalError on initialization failure', async () => {
      (mockClient.waitForInitialization as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Init failed');
      });
      const emitSpy = jest.spyOn(provider.events, 'emit');
      await expect(provider.initialize(mockContext)).rejects.toThrow(ProviderFatalError);
      expect(emitSpy).toHaveBeenCalledWith(ServerProviderEvents.Error);
      expect(provider['client']).toBe(mockClient);
    });

    it('should throw InvalidContextError if context is not provided', async () => {
      const undefinedContext: EvaluationContext = undefined as unknown as EvaluationContext;
      await expect(provider.initialize(undefinedContext)).rejects.toThrow(InvalidContextError);
    });

    it('should use default timeout if not provided in options', async () => {
      provider = new BucketeerProvider(userConfig);
      await provider.initialize(mockContext);
      expect(mockClient.waitForInitialization).toHaveBeenCalledWith({
        timeout: DEFAULT_WAIT_FOR_INITIALIZATION_TIMEOUT_MS,
      });
    });
  });

  describe('flag evaluation methods', () => {
    it('should resolve boolean evaluation', async () => {
      await provider.initialize(mockContext);
      mockClient.booleanVariationDetails.mockResolvedValue({
        featureId: 'test-feature',
        featureVersion: 1,
        userId: 'test-user',
        variationId: 'var-id',
        variationValue: true,
        variationName: 'true-variant',
        reason: 'TARGET',
      } satisfies BKTEvaluationDetails<boolean>);
      const result = await provider.resolveBooleanEvaluation(
        'test-feature',
        false,
        mockContext,
        console,
      );
      expect(mockClient.booleanVariationDetails).toHaveBeenCalled();
      expect(result).toEqual({
        value: true,
        variant: 'true-variant',
        reason: 'TARGET',
      } satisfies ResolutionDetails<boolean>);
    });

    it('should resolve string evaluation', async () => {
      await provider.initialize(mockContext);
      mockClient.stringVariationDetails.mockResolvedValue({
        featureId: 'test-feature',
        featureVersion: 1,
        userId: 'test-user',
        variationId: 'var-id',
        variationValue: 'active',
        variationName: 'active-variant',
        reason: 'RULE',
      } satisfies BKTEvaluationDetails<string>);
      const result = await provider.resolveStringEvaluation(
        'test-feature',
        'default',
        mockContext,
        console,
      );
      expect(mockClient.stringVariationDetails).toHaveBeenCalled();
      expect(result).toEqual({
        value: 'active',
        variant: 'active-variant',
        reason: 'RULE',
      } satisfies ResolutionDetails<string>);
    });

    it('should resolve number evaluation', async () => {
      await provider.initialize(mockContext);
      mockClient.numberVariationDetails.mockResolvedValue({
        featureId: 'test-feature',
        featureVersion: 1,
        userId: 'test-user',
        variationId: 'var-id',
        variationValue: 42,
        variationName: 'number-variant',
        reason: 'DEFAULT',
      } satisfies BKTEvaluationDetails<number>);
      const result = await provider.resolveNumberEvaluation(
        'test-feature',
        0,
        mockContext,
        console,
      );
      expect(mockClient.numberVariationDetails).toHaveBeenCalled();
      expect(result).toEqual({
        value: 42,
        variant: 'number-variant',
        reason: 'DEFAULT',
      } satisfies ResolutionDetails<number>);
    });

    it('should resolve object evaluation', async () => {
      await provider.initialize(mockContext);
      mockClient.objectVariationDetails.mockResolvedValue({
        featureId: 'test-feature',
        featureVersion: 1,
        userId: 'test-user',
        variationId: 'var-id',
        variationValue: { key: 'value' },
        variationName: 'object-variant',
        reason: 'CLIENT',
      } satisfies BKTEvaluationDetails<BKTValue>);
      const result = await provider.resolveObjectEvaluation(
        'test-feature',
        {},
        mockContext,
        console,
      );
      expect(mockClient.objectVariationDetails).toHaveBeenCalled();
      expect(result).toEqual({
        value: { key: 'value' },
        variant: 'object-variant',
        reason: 'CLIENT',
      } satisfies ResolutionDetails<object>);
    });

    it('should handle type mismatch in object evaluation', async () => {
      await provider.initialize(mockContext);
      mockClient.objectVariationDetails.mockResolvedValue({
        featureId: 'test-feature',
        featureVersion: 1,
        userId: 'test-user',
        variationId: 'var-id',
        variationValue: 'not-an-object',
        variationName: 'wrong-type-variant',
        reason: 'DEFAULT',
      } satisfies BKTEvaluationDetails<BKTValue>);
      const defaultValue = { default: true };
      const result = await provider.resolveObjectEvaluation(
        'test-feature',
        defaultValue,
        mockContext,
        console,
      );
      expect(result).toEqual({
        value: defaultValue,
        reason: StandardResolutionReasons.ERROR,
        errorCode: ErrorCode.TYPE_MISMATCH,
        errorMessage: 'Expected object but got string',
      });
    });
  });

  describe('utility methods', () => {
    it('should destroy client on close', async () => {
      await provider.initialize(mockContext);
      await provider.onClose();
      expect(mockClient.destroy).toHaveBeenCalled();
      expect(provider['client']).toBeUndefined();
    });

    it('should throw ProviderNotReadyError if BKTClient is not initialized', () => {
      provider['client'] = undefined;
      const emitSpy = jest.spyOn(provider.events, 'emit');
      expect(() => provider.requiredBKTClient()).toThrow(ProviderNotReadyError);
      expect(emitSpy).toHaveBeenCalledWith(ServerProviderEvents.Error);
    });

    it('should correctly create wrongTypeResult', () => {
      const result = wrongTypeResult('default', 'Type error');
      expect(result).toEqual({
        value: 'default',
        reason: StandardResolutionReasons.ERROR,
        errorCode: ErrorCode.TYPE_MISMATCH,
        errorMessage: 'Type error',
      });
    });
  });
});
