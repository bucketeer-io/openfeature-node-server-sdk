import { BuckeeterProvider, SOURCE_ID_OPEN_FEATURE_NODE, wrongTypeResult } from '../src/internal/BucketeerProvider';
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
      expect(mockClient.waitForInitialization).toHaveBeenCalledWith({timeout: 30_000});
      expect(emitSpy).toHaveBeenCalledWith(ServerProviderEvents.Ready);
    });

    it('should emit ready event even on timeout error', async () => {
      (mockClient.waitForInitialization as jest.Mock).mockImplementationOnce(() => {
        throw Object.assign(new Error('Timeout'), { name: 'TimeoutError' });
      });
      const emitSpy = jest.spyOn(provider.events, 'emit');
      await provider.initialize(mockContext);
      expect(mockClient.waitForInitialization).toHaveBeenCalledWith({timeout: 30_000});
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
});
