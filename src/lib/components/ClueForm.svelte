<script>
  let {
    countryCode = '',
    categories = [],
    existingClue = null,
    onSave = () => {},
    onCancel = () => {}
  } = $props();

  let category = $state(existingClue?.category || (categories[0]?.slug ?? ''));
  let clueText = $state(existingClue?.clue || '');
  let imageUrl = $state(existingClue?.image_url || '');
  let saving = $state(false);
  let error = $state('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!clueText.trim()) {
      error = 'Clue text is required';
      return;
    }

    saving = true;
    error = '';

    const body = {
      country_code: countryCode,
      category,
      clue: clueText.trim(),
      image_url: imageUrl.trim()
    };

    const url = existingClue ? `/api/clues/${existingClue.id}` : '/api/clues';
    const method = existingClue ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      onSave();
    } else {
      const data = await res.json();
      error = data.error || 'Failed to save';
    }

    saving = false;
  }
</script>

<form class="clue-form" onsubmit={handleSubmit}>
  <div class="field">
    <label for="category">Category</label>
    <select id="category" bind:value={category}>
      {#each categories as cat}
        <option value={cat.slug}>{cat.icon} {cat.label}</option>
      {/each}
    </select>
  </div>

  <div class="field">
    <label for="clue">Clue</label>
    <textarea id="clue" bind:value={clueText} rows="3" placeholder="Describe the clue..."></textarea>
  </div>

  <div class="field">
    <label for="image">Image URL</label>
    <input id="image" type="url" bind:value={imageUrl} placeholder="https://..." />
    {#if imageUrl}
      <img class="preview" src={imageUrl} alt="Preview" onerror={(e) => e.target.style.display='none'} />
    {/if}
  </div>

  {#if error}
    <p class="error">{error}</p>
  {/if}

  <div class="form-actions">
    <button type="button" class="btn-cancel" onclick={onCancel} disabled={saving}>Cancel</button>
    <button type="submit" class="btn-save" disabled={saving}>
      {saving ? 'Saving...' : existingClue ? 'Update' : 'Add Clue'}
    </button>
  </div>
</form>

<style>
  .clue-form {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  textarea {
    resize: vertical;
    min-height: 60px;
  }

  .preview {
    max-width: 100%;
    max-height: 80px;
    border-radius: var(--radius-sm);
    margin-top: 4px;
    object-fit: cover;
  }

  .error {
    color: var(--danger);
    font-size: 13px;
  }

  .form-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .btn-cancel {
    padding: 8px 16px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    border: 1px solid var(--border);
  }

  .btn-cancel:hover {
    background: var(--surface-hover);
  }

  .btn-save {
    padding: 8px 16px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 500;
    background: var(--accent);
    color: var(--accent-text);
  }

  .btn-save:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .btn-save:disabled,
  .btn-cancel:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
