import { Router } from 'express';
import { OpenFeature } from '@openfeature/server-sdk';

const router = Router();
const client = OpenFeature.getClient();

router.post('/evaluate', async (req, res) => {
  // Create evaluation context from request
  // In a real app, you'd get the user ID from your auth system
  const userId = (req.headers['x-user-id'] as string) || 'anonymous';
  const userEmail = req.headers['x-user-email'] as string;

  const context = {
    targetingKey: userId,
    email: userEmail,
    userAgent: req.get('User-Agent'),
    ipAddress: req.ip,
  };

  try {
    const features = {
      newDashboard: await client.getBooleanValue('new-dashboard', false, context),
      welcomeMessage: await client.getStringValue('welcome-message', 'Welcome!', context),
      maxItems: await client.getNumberValue('max-items-per-page', 10, context),
    };

    res.json(features);
  } catch (error) {
    console.error('Feature flag evaluation error:', error);
    res.status(500).json({ error: 'Failed to evaluate features' });
  }
});

export default router;
