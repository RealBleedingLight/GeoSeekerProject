import { ADMIN_PASSWORD } from '$env/static/private';
import { createHmac } from 'crypto';

export function createSessionToken() {
  return createHmac('sha256', ADMIN_PASSWORD).update('geoseeker-admin').digest('hex');
}

export function verifySessionToken(token) {
  if (!token) return false;
  return token === createSessionToken();
}
