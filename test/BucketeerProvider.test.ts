import {
  BuckeeterProvider,
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
  JsonValue,
} from '@openfeature/server-sdk';
import { SDK_VERSION } from '../src/internal/version';

jest.mock('bkt-node-server-sdk', () => {
  return {
    defineBKTConfig: jest.fn((cfg) => cfg),
    initializeBKTClient: jest.fn(),
    Bucketeer: jest.fn(),
  };
});

describe('BuckeeterProvider', () => {
  let provider: BuckeeterProvider;
  let mockClient: jest.Mocked<Bucketeer>;
  let mockConfig: BKTConfig;
  let expectedConfig: BKTConfig;
  let mockContext: EvaluationContext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
      apiKey: 'test-api-key',
      apiEndpoint: 'http://test-endpoint',
      featureTag: 'test-tag',
      eventsFlushInterval: 30,
      eventsMaxQueueSize: 100,
      pollingInterval: 60,
      appVersion: '1.0.0',
      userAgent: 'test-agent',
      fetch: jest.fn(),
      storageFactory: jest.fn(),
      logger: console,
      enableLocalEvaluation: false,
      cachePollingInterval: 60,
    } as BKTConfig;

    expectedConfig = {
      ...mockConfig,
      wrapperSdkVersion: SDK_VERSION,
      wrapperSdkSourceId: SOURCE_ID_OPEN_FEATURE_NODE,
    };

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
    } as any;

    (initializeBKTClient as jest.Mock).mockReturnValue(mockClient);
    provider = new BuckeeterProvider(mockConfig);
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(provider.metadata.name).toBe('Buckeeter Provider');
      expect(provider.runsOn).toBe('server');
    });
  });

  describe('initialization', () => {
    it('should successfully initialize the provider', async () => {
      const emitSpy = jest.spyOn(provider.events, 'emit');
      await provider.initialize(mockContext);
      expect(initializeBKTClient).toHaveBeenCalledWith(expect.objectContaining(expectedConfig));
      expect(mockClient.waitForInitialization).toHaveBeenCalledWith({ timeout: 30_000 });
      expect(emitSpy).toHaveBeenCalledWith(ServerProviderEvents.Ready);
    });

    it('should emit ready event even on timeout error', async () => {
      (mockClient.waitForInitialization as jest.Mock).mockImplementationOnce(() => {
        throw Object.assign(new Error('Timeout'), { name: 'TimeoutError' });
      });
      const emitSpy = jest.spyOn(provider.events, 'emit');
      await provider.initialize(mockContext);
      expect(mockClient.waitForInitialization).toHaveBeenCalledWith({ timeout: 30_000 });
      expect(emitSpy).toHaveBeenCalledWith(ServerProviderEvents.Ready);
    });

    it('should emit error and throw ProviderFatalError on initialization failure', async () => {
      (mockClient.waitForInitialization as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Init failed');
      });
      const emitSpy = jest.spyOn(provider.events, 'emit');
      await expect(provider.initialize(mockContext)).rejects.toThrow(ProviderFatalError);
      expect(emitSpy).toHaveBeenCalledWith(ServerProviderEvents.Error);
    });

    it('should throw InvalidContextError if context is not provided', async () => {
      await expect(provider.initialize(undefined as any)).rejects.toThrow(InvalidContextError);
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
      } satisfies ResolutionDetails<{}>);
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
