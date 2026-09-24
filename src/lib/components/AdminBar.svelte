<script>
  import { goto } from '$app/navigation';
  import { isAdmin } from '$lib/stores/admin';

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    isAdmin.set(false);
    goto('/');
  }
</script>

{#if $isAdmin}
  <div class="admin-bar">
    <span class="admin-dot"></span>
    <span class="admin-label">Admin</span>
    <button class="logout-btn" onclick={logout}>Sign out</button>
  </div>
{/if}

<style>
  .admin-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px;
    border-radius: 20px;
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    font-size: 12px;
    font-weight: 500;
  }

  .admin-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #22c55e;
  }

  .admin-label {
    color: var(--accent);
  }

  .logout-btn {
    color: var(--text-secondary);
    font-size: 12px;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    transition: color 0.15s;
  }

  .logout-btn:hover {
    color: var(--text-primary);
  }
</style>
