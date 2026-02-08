import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { errorHandler } from './middlewares/errorHandler.js';
import routes from './routes/index.js';

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/v1', routes);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`API running on port ${port}`);
});
