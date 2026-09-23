<script>
  import { goto } from '$app/navigation';
  import { isAdmin } from '$lib/stores/admin';

  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleLogin(e) {
    e.preventDefault();
    error = '';
    loading = true;

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    if (res.ok) {
      isAdmin.set(true);
      goto('/');
    } else {
      error = 'Invalid password';
    }
    loading = false;
  }
</script>

<div class="login-page">
  <form class="login-form" onsubmit={handleLogin}>
    <h1>GeoSeeker Admin</h1>
    <input
      type="password"
      placeholder="Enter passphrase"
      bind:value={password}
      disabled={loading}
      autofocus
    />
    {#if error}
      <p class="error">{error}</p>
    {/if}
    <button type="submit" class="btn-primary" disabled={loading}>
      {loading ? 'Signing in...' : 'Sign in'}
    </button>
    <a href="/">← Back to map</a>
  </form>
</div>

<style>
  .login-page {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg);
  }

  .login-form {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 40px;
    width: 100%;
    max-width: 380px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: var(--shadow-lg);
  }

  h1 {
    font-size: 20px;
    font-weight: 600;
    text-align: center;
  }

  .btn-primary {
    background: var(--accent);
    color: var(--accent-text);
    padding: 10px 16px;
    border-radius: var(--radius-sm);
    font-weight: 500;
    transition: background 0.15s;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error {
    color: var(--danger);
    font-size: 14px;
    text-align: center;
  }

  a {
    text-align: center;
    font-size: 14px;
    color: var(--text-secondary);
  }
</style>
