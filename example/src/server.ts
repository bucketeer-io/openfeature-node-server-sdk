import express from 'express';
import { OpenFeature } from '@openfeature/server-sdk';
import { BucketeerProvider } from '@bucketeer/openfeature-node-server-sdk';
import { bucketeerConfig } from './config/bucketeer-config.js';
import flagsRouter from './routes/flags.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Initialize BucketeerProvider and OpenFeature
const provider = new BucketeerProvider(bucketeerConfig);
OpenFeature.setProvider(provider);

app.use('/flags', flagsRouter);

app.get('/', (req, res) => {
  res.send('Bucketeer OpenFeature Express API Example');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
