import { verifySessionToken } from '$lib/server/auth';

export async function handle({ event, resolve }) {
  const token = event.cookies.get('session');
  event.locals.isAdmin = verifySessionToken(token);
  return resolve(event);
}
