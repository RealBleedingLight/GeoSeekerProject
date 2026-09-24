import { env } from '$env/dynamic/private';
import { createHmac } from 'crypto';

export function createSessionToken() {
  return createHmac('sha256', env.ADMIN_PASSWORD).update('geoseeker-admin').digest('hex');
}

export function verifySessionToken(token) {
  if (!token || !env.ADMIN_PASSWORD) return false;
  return token === createSessionToken();
}
