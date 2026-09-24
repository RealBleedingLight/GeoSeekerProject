<script>
  let { clue, isAdmin = false, onEdit = () => {}, onDelete = () => {} } = $props();

  let imageExpanded = $state(false);
</script>

<div class="card">
  <p class="clue-text">{clue.clue}</p>

  {#if clue.image_url}
    <button class="image-thumb" onclick={() => (imageExpanded = !imageExpanded)}>
      <img src={clue.image_url} alt="Clue reference" loading="lazy" />
    </button>
    {#if imageExpanded}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="image-expanded" onclick={() => (imageExpanded = false)} onkeydown={() => (imageExpanded = false)} role="button" tabindex="-1">
        <img src={clue.image_url} alt="Clue reference expanded" />
      </div>
    {/if}
  {/if}

  {#if isAdmin}
    <div class="card-actions">
      <button class="action-btn edit" onclick={onEdit} aria-label="Edit clue">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      <button class="action-btn delete" onclick={onDelete} aria-label="Delete clue">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  {/if}
</div>

<style>
  .card {
    position: relative;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px;
    transition: box-shadow 0.15s;
  }

  .card:hover {
    box-shadow: var(--shadow);
  }

  .clue-text {
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-primary);
  }

  .image-thumb {
    margin-top: 10px;
    padding: 0;
    border-radius: var(--radius-sm);
    overflow: hidden;
    display: block;
  }

  .image-thumb img {
    display: block;
    max-width: 100%;
    max-height: 120px;
    object-fit: cover;
    border-radius: var(--radius-sm);
  }

  .image-expanded {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3000;
    cursor: pointer;
  }

  .image-expanded img {
    max-width: 90vw;
    max-height: 90vh;
    border-radius: var(--radius);
  }

  .card-actions {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .card:hover .card-actions {
    opacity: 1;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    transition: all 0.15s;
  }

  .action-btn.edit:hover {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, transparent);
  }

  .action-btn.delete:hover {
    color: var(--danger);
    background: color-mix(in srgb, var(--danger) 10%, transparent);
  }
</style>
