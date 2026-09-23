import { json } from '@sveltejs/kit';
import { ADMIN_PASSWORD } from '$env/static/private';
import { createSessionToken } from '$lib/server/auth';

export async function POST({ request, cookies }) {
  const { password } = await request.json();

  if (password !== ADMIN_PASSWORD) {
    return json({ error: 'Invalid password' }, { status: 401 });
  }

  cookies.set('session', createSessionToken(), {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7
  });

  return json({ success: true });
}
