import { EvaluationDetails, JsonValue, OpenFeature, ProviderStatus } from '@openfeature/server-sdk';
import { defineBKTConfig, BKTConfig } from 'bkt-node-server-sdk';
import { BucketeerProvider, SDK_VERSION } from '../../lib';
import {
  ENDPOINT,
  API_KEY,
  FEATURE_TAG,
  TARGETED_USER_ID,
  FEATURE_ID_BOOLEAN,
  FEATURE_ID_STRING,
  FEATURE_ID_INT,
  FEATURE_ID_FLOAT,
  FEATURE_ID_JSON,
} from './constants';

describe('BucketeerProvider - evaluation', () => {
  let config: BKTConfig;

  afterAll(() => {
    OpenFeature.close();
  });

  afterEach(async () => {
    await OpenFeature.clearProviders();
  });

  beforeEach(async () => {
    config = defineBKTConfig({
      apiEndpoint: ENDPOINT,
      apiKey: API_KEY,
      featureTag: FEATURE_TAG,
      appVersion: '1.2.3',
    });

    const context = {
      targetingKey: TARGETED_USER_ID,
      app_version: '1.2.3',
    };

    OpenFeature.setContext(context);
    const provider = new BucketeerProvider(config);
    await OpenFeature.setProviderAndWait(provider);

    const client = OpenFeature.getClient();
    expect(client.metadata.providerMetadata.name).toBe('Bucketeer Provider');
    expect(client.metadata.providerMetadata.version).toBe(SDK_VERSION);
    expect(client.providerStatus).toBe(ProviderStatus.READY);
  });

  describe('boolean evaluation', () => {
    it('should evaluate boolean feature flag', async () => {
      const client = OpenFeature.getClient();
      const result = await client.getBooleanValue(FEATURE_ID_BOOLEAN, false);
      expect(typeof result).toBe('boolean');
      expect(result).toBe(true);

      const resultDetails = await client.getBooleanDetails(FEATURE_ID_BOOLEAN, false);
      expect(resultDetails).toEqual({
        flagKey: FEATURE_ID_BOOLEAN,
        flagMetadata: {},
        reason: 'DEFAULT',
        value: true,
        variant: 'variation 1',
      } satisfies EvaluationDetails<boolean>);
    });
  });

  describe('string evaluation', () => {
    it('should evaluate string feature flag', async () => {
      const client = OpenFeature.getClient();
      const result = await client.getStringValue(FEATURE_ID_STRING, '');
      expect(typeof result).toBe('string');
      expect(result).toBe('value-1');

      const resultDetails = await client.getStringDetails(FEATURE_ID_STRING, '');
      expect(resultDetails).toEqual({
        flagKey: FEATURE_ID_STRING,
        flagMetadata: {},
        reason: 'DEFAULT',
        value: 'value-1',
        variant: 'variation 1',
      } satisfies EvaluationDetails<string>);
    });
  });

  describe('number evaluation', () => {
    it('should evaluate int feature flag', async () => {
      const client = OpenFeature.getClient();
      const result = await client.getNumberValue(FEATURE_ID_INT, 0);
      expect(typeof result).toBe('number');
      expect(result).toBe(10);

      const resultDetails = await client.getNumberDetails(FEATURE_ID_INT, 0);
      expect(resultDetails).toEqual({
        flagKey: FEATURE_ID_INT,
        flagMetadata: {},
        reason: 'DEFAULT',
        value: 10,
        variant: 'variation 1',
      } satisfies EvaluationDetails<number>);
    });

    it('should evaluate float feature flag', async () => {
      const client = OpenFeature.getClient();
      const result = await client.getNumberValue(FEATURE_ID_FLOAT, 0.0);
      expect(typeof result).toBe('number');
      expect(result).toBe(2.1);

      const resultDetails = await client.getNumberDetails(FEATURE_ID_FLOAT, 0.0);
      expect(resultDetails).toEqual({
        flagKey: FEATURE_ID_FLOAT,
        flagMetadata: {},
        reason: 'DEFAULT',
        value: 2.1,
        variant: 'variation 1',
      } satisfies EvaluationDetails<number>);
    });
  });

  describe('object evaluation', () => {
    it('should evaluate json feature flag', async () => {
      const client = OpenFeature.getClient();
      const result = await client.getObjectValue(FEATURE_ID_JSON, {});
      expect(typeof result).toBe('object');
      expect(result).toEqual({ str: 'str1', int: 'int1' });

      const resultDetails = await client.getObjectDetails(FEATURE_ID_JSON, {});
      expect(resultDetails).toEqual({
        flagKey: FEATURE_ID_JSON,
        flagMetadata: {},
        reason: 'DEFAULT',
        value: { str: 'str1', int: 'int1' },
        variant: 'variation 1',
      } satisfies EvaluationDetails<JsonValue>);
    });
  });
});
