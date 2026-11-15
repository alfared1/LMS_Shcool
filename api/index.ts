import dotenv from 'dotenv';
import { createApiApp } from '../src/server/app.ts';

dotenv.config();

const app = createApiApp();

export default app;
