import { Router } from 'express';
import { OpenFeature } from '@openfeature/server-sdk';

const router = Router();
const client = OpenFeature.getClient();

router.post('/evaluate', async (req, res) => {
  const { flagKey, defaultValue, context, type } = req.body;

  try {
    let value;
    switch (type) {
      case 'boolean':
        value = await client.getBooleanValue(flagKey, defaultValue, context);
        break;
      case 'string':
        value = await client.getStringValue(flagKey, defaultValue, context);
        break;
      case 'number':
        value = await client.getNumberValue(flagKey, defaultValue, context);
        break;
      case 'object':
        value = await client.getObjectValue(flagKey, defaultValue, context);
        break;
      default:
        return res.status(400).json({ error: 'Invalid flag type' });
    }
    res.json({ flagKey, value });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
