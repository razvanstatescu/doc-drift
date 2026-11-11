import type pg from 'pg';
import type { Config } from './config.js';

export interface Deps {
  config: Config;
  pool: pg.Pool;
}
