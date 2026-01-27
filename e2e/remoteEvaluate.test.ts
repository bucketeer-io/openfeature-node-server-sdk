import { EvaluationDetails, JsonValue, OpenFeature, ProviderStatus } from '@openfeature/server-sdk';
import { BucketeerProvider, SDK_VERSION, defineBKTConfig, BKTConfig } from '../lib';
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
} from './constants/constants';

describe('BucketeerProvider - evaluation', () => {
  let config: BKTConfig;
  const context = {
    targetingKey: TARGETED_USER_ID,
    app_version: '1.2.3',
  };

  afterAll(async () => {
    await OpenFeature.close();
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
      logger: console,
    });

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
      const result = await client.getBooleanValue(FEATURE_ID_BOOLEAN, true, context);
      expect(typeof result).toBe('boolean');
      expect(result).toBe(false);

      const resultDetails = await client.getBooleanDetails(FEATURE_ID_BOOLEAN, true, context);
      expect(resultDetails).toEqual({
        flagKey: FEATURE_ID_BOOLEAN,
        flagMetadata: {},
        reason: 'TARGET',
        value: false,
        variant: 'variation 2',
      } satisfies EvaluationDetails<boolean>);
    });
  });

  describe('string evaluation', () => {
    it('should evaluate string feature flag', async () => {
      const client = OpenFeature.getClient();
      const result = await client.getStringValue(FEATURE_ID_STRING, '', context);
      expect(typeof result).toBe('string');
      expect(result).toBe('value-2');

      const resultDetails = await client.getStringDetails(FEATURE_ID_STRING, '', context);
      expect(resultDetails).toEqual({
        flagKey: FEATURE_ID_STRING,
        flagMetadata: {},
        reason: 'TARGET',
        value: 'value-2',
        variant: 'variation 2',
      } satisfies EvaluationDetails<string>);
    });
  });

  describe('number evaluation', () => {
    it('should evaluate int feature flag', async () => {
      const client = OpenFeature.getClient();
      const result = await client.getNumberValue(FEATURE_ID_INT, 10, context);
      expect(typeof result).toBe('number');
      expect(result).toBe(20);

      const resultDetails = await client.getNumberDetails(FEATURE_ID_INT, 30, context);
      expect(resultDetails).toEqual({
        flagKey: FEATURE_ID_INT,
        flagMetadata: {},
        reason: 'TARGET',
        value: 20,
        variant: 'variation 2',
      } satisfies EvaluationDetails<number>);
    });

    it('should evaluate float feature flag', async () => {
      const client = OpenFeature.getClient();
      const result = await client.getNumberValue(FEATURE_ID_FLOAT, 1.1, context);
      expect(typeof result).toBe('number');
      expect(result).toBe(3.1);

      const resultDetails = await client.getNumberDetails(FEATURE_ID_FLOAT, 1.0, context);
      expect(resultDetails).toEqual({
        flagKey: FEATURE_ID_FLOAT,
        flagMetadata: {},
        reason: 'TARGET',
        value: 3.1,
        variant: 'variation 2',
      } satisfies EvaluationDetails<number>);
    });
  });

  describe('object evaluation', () => {
    it('should evaluate json feature flag', async () => {
      const client = OpenFeature.getClient();
      const result = await client.getObjectValue(FEATURE_ID_JSON, {}, context);
      expect(typeof result).toBe('object');
      expect(result).toEqual({ str: 'str2', int: 'int2' });

      const resultDetails = await client.getObjectDetails(FEATURE_ID_JSON, {}, context);
      expect(resultDetails).toEqual({
        flagKey: FEATURE_ID_JSON,
        flagMetadata: {},
        reason: 'TARGET',
        value: { str: 'str2', int: 'int2' },
        variant: 'variation 2',
      } satisfies EvaluationDetails<JsonValue>);
    });
  });

  describe('object evaluation - type validation', () => {
    it('should return error when defaultValue is a primitive (string|number|boolean|null)', async () => {
      const client = OpenFeature.getClient();
      const cases = [
        {
          value: 'invalid-string-default',
          expectedMessage: 'Default value must be an object or array but got string',
        },
        { value: 123, expectedMessage: 'Default value must be an object or array but got number' },
        { value: true, expectedMessage: 'Default value must be an object or array but got boolean' },
        { value: null, expectedMessage: 'Default value must be an object or array but got null' },
      ];

      for (const c of cases) {
        const resultDetails = await client.getObjectDetails(FEATURE_ID_JSON, c.value, context);
        expect(typeof resultDetails).toBe('object');
        expect(resultDetails.value).toBe(c.value);
        expect(resultDetails.reason).toBe('ERROR');
        expect(resultDetails.errorCode).toBe('TYPE_MISMATCH');
        expect(resultDetails.errorMessage).toContain(c.expectedMessage);
      }
    });

    // We don't have a array flag in Bucketeer, will add it when we have one
    // For now, we test getting array from a plain object flag
    it('should return a default value when trying to get array from a plain object flag', async () => {
      const client = OpenFeature.getClient();
      const arrayDefault = [
        { id: 1, name: 'item1', tags: ['a', 'b'] },
        { id: 2, name: 'item2', tags: ['c', 'd'] },
      ];

      const result = await client.getObjectValue(FEATURE_ID_JSON, arrayDefault, context);
      expect(Array.isArray(result)).toBe(true);

      const resultDetails = await client.getObjectDetails(FEATURE_ID_JSON, arrayDefault, context);
      expect(typeof resultDetails).toBe('object');
      expect(resultDetails.reason).toBe('ERROR');
      // The expected error message depends on the current implementation behavior for type mismatch
    });

    test('should return a default value when trying to get object from primitive flags', async () => {
      // The Bucketeer Node.js SDK's objectVariationDetails
      // guarantees it returns an object or array (it returns the default value if the flag type doesn't match)
      const client = OpenFeature.getClient()
      const primitiveFlags = [
        FEATURE_ID_BOOLEAN,
        FEATURE_ID_INT,
        FEATURE_ID_STRING,
      ]

      for (const flag of primitiveFlags) {
        const resultDetails = await client.getObjectDetails(
          flag,
          { default: 'fallback' },
          context,
        )

        expect(typeof resultDetails).toBe('object')
        expect(resultDetails.reason).toBe('CLIENT')
        expect(resultDetails.errorCode).toBeUndefined()
        expect(resultDetails.errorMessage).toBeUndefined()
        expect(resultDetails.value).toEqual({ default: 'fallback' })
      }
    })
  });
});
