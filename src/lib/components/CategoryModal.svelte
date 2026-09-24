<script>
  import { fly } from 'svelte/transition';

  let { open = false, onClose = () => {}, onChanged = () => {} } = $props();

  let categories = $state([]);
  let loading = $state(true);
  let newSlug = $state('');
  let newLabel = $state('');
  let newIcon = $state('');
  let error = $state('');
  let editingSlug = $state(null);
  let editLabel = $state('');
  let editIcon = $state('');

  $effect(() => {
    if (open) loadCategories();
  });

  async function loadCategories() {
    loading = true;
    const res = await fetch('/api/categories');
    categories = await res.json();
    loading = false;
  }

  async function addCategory(e) {
    e.preventDefault();
    error = '';

    if (!newSlug.trim() || !newLabel.trim()) {
      error = 'Slug and label are required';
      return;
    }

    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: newSlug.trim().toLowerCase().replace(/\s+/g, '-'),
        label: newLabel.trim(),
        icon: newIcon.trim()
      })
    });

    if (res.ok) {
      newSlug = '';
      newLabel = '';
      newIcon = '';
      await loadCategories();
      onChanged();
    } else {
      const data = await res.json();
      error = data.error || 'Failed to create';
    }
  }

  function startEdit(cat) {
    editingSlug = cat.slug;
    editLabel = cat.label;
    editIcon = cat.icon;
  }

  async function saveEdit() {
    const res = await fetch(`/api/categories/${editingSlug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: editLabel, icon: editIcon })
    });

    if (res.ok) {
      editingSlug = null;
      await loadCategories();
      onChanged();
    }
  }

  async function deleteCategory(slug) {
    if (!confirm(`Delete category "${slug}"?`)) return;

    const res = await fetch(`/api/categories/${slug}`, { method: 'DELETE' });
    if (res.ok) {
      await loadCategories();
      onChanged();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete');
    }
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="overlay" onclick={onClose} onkeydown={onClose} transition:fly={{ duration: 150 }}></div>
  <div class="modal" transition:fly={{ y: 20, duration: 200 }}>
    <div class="modal-header">
      <h2>Manage Categories</h2>
      <button class="close-btn" onclick={onClose}>×</button>
    </div>

    <div class="modal-body">
      {#if loading}
        <p class="loading">Loading...</p>
      {:else}
        <div class="cat-list">
          {#each categories as cat}
            <div class="cat-row">
              {#if editingSlug === cat.slug}
                <input bind:value={editIcon} placeholder="Icon" class="input-sm icon-input" />
                <input bind:value={editLabel} placeholder="Label" class="input-sm" />
                <button class="btn-sm save" onclick={saveEdit}>Save</button>
                <button class="btn-sm" onclick={() => (editingSlug = null)}>Cancel</button>
              {:else}
                <span class="cat-icon">{cat.icon}</span>
                <span class="cat-label">{cat.label}</span>
                <span class="cat-slug">{cat.slug}</span>
                <button class="btn-sm" onclick={() => startEdit(cat)}>Edit</button>
                <button class="btn-sm danger" onclick={() => deleteCategory(cat.slug)}>Delete</button>
              {/if}
            </div>
          {/each}
        </div>

        <form class="add-form" onsubmit={addCategory}>
          <h3>Add Category</h3>
          <div class="add-fields">
            <input bind:value={newIcon} placeholder="Icon" class="input-sm icon-input" />
            <input bind:value={newSlug} placeholder="slug" class="input-sm" />
            <input bind:value={newLabel} placeholder="Display Label" class="input-sm" />
            <button type="submit" class="btn-sm save">Add</button>
          </div>
          {#if error}
            <p class="error">{error}</p>
          {/if}
        </form>
      {/if}
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 2500;
  }

  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-lg);
    width: 520px;
    max-width: 90vw;
    max-height: 80vh;
    overflow-y: auto;
    z-index: 2600;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    border-bottom: 1px solid var(--border);
  }

  .modal-header h2 {
    font-size: 16px;
    font-weight: 600;
  }

  .close-btn {
    font-size: 20px;
    color: var(--text-secondary);
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
  }

  .close-btn:hover {
    background: var(--surface-hover);
  }

  .modal-body {
    padding: 20px;
  }

  .cat-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 20px;
  }

  .cat-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border-radius: var(--radius-sm);
    background: var(--bg);
  }

  .cat-icon {
    width: 24px;
    text-align: center;
  }

  .cat-label {
    font-weight: 500;
    flex: 1;
  }

  .cat-slug {
    font-size: 12px;
    color: var(--text-secondary);
    font-family: monospace;
  }

  .add-form {
    border-top: 1px solid var(--border);
    padding-top: 16px;
  }

  .add-form h3 {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }

  .add-fields {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .input-sm {
    padding: 6px 10px;
    font-size: 13px;
    flex: 1;
  }

  .icon-input {
    max-width: 60px;
    text-align: center;
  }

  .btn-sm {
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 500;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    border: 1px solid var(--border);
    white-space: nowrap;
  }

  .btn-sm:hover {
    background: var(--surface-hover);
  }

  .btn-sm.save {
    background: var(--accent);
    color: var(--accent-text);
    border-color: var(--accent);
  }

  .btn-sm.save:hover {
    background: var(--accent-hover);
  }

  .btn-sm.danger:hover {
    color: var(--danger);
    border-color: var(--danger);
  }

  .error {
    color: var(--danger);
    font-size: 13px;
    margin-top: 8px;
  }

  .loading {
    color: var(--text-secondary);
    text-align: center;
    padding: 20px;
  }
</style>
