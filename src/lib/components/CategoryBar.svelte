<script>
  let { categories = [], activeSlug = null, onSelect = () => {} } = $props();
</script>

<nav class="category-bar">
  {#each categories as cat}
    <button
      class="pill"
      class:active={activeSlug === cat.slug}
      onclick={() => onSelect(cat.slug)}
    >
      {#if cat.icon}<span class="pill-icon">{cat.icon}</span>{/if}
      {cat.label}
    </button>
  {/each}
</nav>

<style>
  .category-bar {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .category-bar::-webkit-scrollbar {
    display: none;
  }

  .pill {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    color: var(--text-secondary);
    background: var(--surface);
    border: 1px solid var(--border);
    transition: all 0.15s;
  }

  .pill:hover {
    color: var(--text-primary);
    border-color: var(--accent);
  }

  .pill.active {
    background: var(--accent);
    color: var(--accent-text);
    border-color: var(--accent);
  }

  .pill-icon {
    font-size: 14px;
  }

  @media (max-width: 640px) {
    .pill {
      padding: 5px 10px;
      font-size: 12px;
    }
  }
</style>
