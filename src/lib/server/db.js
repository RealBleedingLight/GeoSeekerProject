import { neon } from '@neondatabase/serverless';
import { env } from '$env/dynamic/private';

export const sql = neon(env.DATABASE_URL);
