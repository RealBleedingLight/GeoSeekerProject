<script>
  import { fly } from 'svelte/transition';
  import ClueCard from './ClueCard.svelte';
  import ClueForm from './ClueForm.svelte';

  let {
    open = false,
    mode = 'country',
    data = null,
    loading = false,
    isAdmin = false,
    onClose = () => {},
    onCategoryClick = () => {},
    onCountryClick = () => {},
    onDataChanged = () => {}
  } = $props();

  let addingToSection = $state(null);
  let editingClue = $state(null);
  let allCategories = $state([]);
  let collapsedSections = $state(new Set());

  $effect(() => {
    if (open && isAdmin) {
      fetch('/api/categories').then(r => r.json()).then(cats => (allCategories = cats));
    }
  });

  $effect(() => {
    if (!open) {
      addingToSection = null;
      editingClue = null;
      collapsedSections = new Set();
    }
  });

  function groupByCategory(clues) {
    const groups = {};
    for (const clue of clues) {
      const key = clue.category;
      if (!groups[key]) {
        groups[key] = {
          slug: clue.category,
          label: clue.category_label,
          icon: clue.category_icon,
          clues: []
        };
      }
      groups[key].clues.push(clue);
    }
    return Object.values(groups);
  }

  function toggleSection(slug) {
    const next = new Set(collapsedSections);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    collapsedSections = next;
  }

  function countryFlag(code) {
    if (!code || code.length !== 2) return '';
    return String.fromCodePoint(
      ...[...code.toUpperCase()].map(c => 0x1f1e6 + c.charCodeAt(0) - 65)
    );
  }

  async function handleDelete(clueId) {
    if (!confirm('Delete this clue?')) return;
    const res = await fetch(`/api/clues/${clueId}`, { method: 'DELETE' });
    if (res.ok) onDataChanged();
  }

  function handleSaved() {
    addingToSection = null;
    editingClue = null;
    onDataChanged();
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="backdrop" onclick={onClose} onkeydown={onClose} transition:fly={{ duration: 200 }}></div>

  <aside class="drawer" transition:fly={{ x: 420, duration: 300, opacity: 1 }}>
    <div class="drawer-header">
      <button class="close-btn" onclick={onClose} aria-label="Close">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {#if loading}
        <div class="loading-text">Loading...</div>
      {:else if mode === 'country' && data?.country}
        <h2>
          <span class="flag">{countryFlag(data.country.code)}</span>
          {data.country.name}
        </h2>
        <span class="badge">{data.clues?.length || 0} clues</span>
      {:else if mode === 'category' && data?.category}
        <h2>
          {#if data.category.icon}<span class="cat-icon">{data.category.icon}</span>{/if}
          {data.category.label}
        </h2>
        <span class="badge">{data.countries?.length || 0} countries</span>
      {/if}
    </div>

    <div class="drawer-body">
      {#if loading}
        <div class="loading-spinner">
          <div class="spinner"></div>
        </div>

      {:else if mode === 'country' && data?.clues}
        {#each groupByCategory(data.clues) as group}
          <section class="section">
            <button class="section-header" onclick={() => toggleSection(group.slug)}>
              <h3>
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <span class="cat-link" role="link" tabindex="0" onclick={(e) => { e.stopPropagation(); onCategoryClick(group.slug); }} onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onCategoryClick(group.slug); } }}>
                  {#if group.icon}<span>{group.icon}</span>{/if}
                  {group.label}
                </span>
              </h3>
              <span class="section-count">{group.clues.length}</span>
              <span class="chevron" class:collapsed={collapsedSections.has(group.slug)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </button>

            {#if !collapsedSections.has(group.slug)}
              <div class="section-body">
                {#each group.clues as clue}
                  {#if editingClue === clue.id}
                    <ClueForm
                      countryCode={data.country.code}
                      countryName={data.country.name}
                      categories={allCategories}
                      existingClue={clue}
                      onSave={handleSaved}
                      onCancel={() => (editingClue = null)}
                    />
                  {:else}
                    <ClueCard
                      {clue}
                      {isAdmin}
                      onEdit={() => (editingClue = clue.id)}
                      onDelete={() => handleDelete(clue.id)}
                    />
                  {/if}
                {/each}

                {#if isAdmin}
                  {#if addingToSection === group.slug}
                    <ClueForm
                      countryCode={data.country.code}
                      countryName={data.country.name}
                      categories={allCategories}
                      existingClue={null}
                      onSave={handleSaved}
                      onCancel={() => (addingToSection = null)}
                    />
                  {:else}
                    <button class="add-clue-btn" onclick={() => (addingToSection = group.slug)}>
                      + Add Clue
                    </button>
                  {/if}
                {/if}
              </div>
            {/if}
          </section>
        {/each}

        {#if isAdmin && data.clues.length === 0}
          <div class="empty">
            <p>No clues yet for this country.</p>
            {#if addingToSection === '__new__'}
              <ClueForm
                countryCode={data.country.code}
                categories={allCategories}
                existingClue={null}
                onSave={handleSaved}
                onCancel={() => (addingToSection = null)}
              />
            {:else}
              <button class="add-clue-btn" onclick={() => (addingToSection = '__new__')}>
                + Add First Clue
              </button>
            {/if}
          </div>
        {:else if data.clues.length === 0}
          <div class="empty">No clues yet for this country.</div>
        {/if}

      {:else if mode === 'category' && data?.countries}
        {#each data.countries as country}
          <section class="section">
            <button class="section-header" onclick={() => toggleSection(country.code)}>
              <h3>
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <span class="country-link" role="link" tabindex="0" onclick={(e) => { e.stopPropagation(); onCountryClick(country.code, country.name); }} onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onCountryClick(country.code, country.name); } }}>
                  <span class="flag">{countryFlag(country.code)}</span>
                  {country.name}
                </span>
              </h3>
              <span class="section-count">{country.clues.length}</span>
              <span class="chevron" class:collapsed={collapsedSections.has(country.code)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </button>

            {#if !collapsedSections.has(country.code)}
              <div class="section-body">
                {#each country.clues as clue}
                  {#if editingClue === clue.id}
                    <ClueForm
                      countryCode={country.code}
                      countryName={country.name}
                      categories={allCategories}
                      existingClue={clue}
                      onSave={handleSaved}
                      onCancel={() => (editingClue = null)}
                    />
                  {:else}
                    <ClueCard
                      {clue}
                      {isAdmin}
                      onEdit={() => (editingClue = clue.id)}
                      onDelete={() => handleDelete(clue.id)}
                    />
                  {/if}
                {/each}

                {#if isAdmin}
                  {#if addingToSection === country.code}
                    <ClueForm
                      countryCode={country.code}
                      countryName={country.name}
                      categories={allCategories}
                      existingClue={null}
                      onSave={handleSaved}
                      onCancel={() => (addingToSection = null)}
                    />
                  {:else}
                    <button class="add-clue-btn" onclick={() => (addingToSection = country.code)}>
                      + Add Clue
                    </button>
                  {/if}
                {/if}
              </div>
            {/if}
          </section>
        {/each}

        {#if data.countries.length === 0}
          <div class="empty">No clues yet for this category.</div>
        {/if}
      {/if}
    </div>
  </aside>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    top: var(--topbar-height);
    background: rgba(0, 0, 0, 0.2);
    z-index: 1500;
  }

  .drawer {
    position: fixed;
    top: var(--topbar-height);
    right: 0;
    bottom: 0;
    width: var(--drawer-width);
    max-width: 90vw;
    background: var(--bg);
    border-left: 1px solid var(--border);
    z-index: 2000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .drawer-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 20px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .close-btn:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  h2 {
    font-size: 18px;
    font-weight: 600;
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .flag {
    font-size: 22px;
  }

  .badge {
    font-size: 12px;
    color: var(--text-secondary);
    background: var(--surface);
    padding: 2px 10px;
    border-radius: 12px;
    border: 1px solid var(--border);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 0;
    text-align: left;
  }

  .section-header h3 {
    flex: 1;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-secondary);
  }

  .section-count {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .chevron {
    transition: transform 0.2s;
    color: var(--text-secondary);
    display: flex;
  }

  .chevron.collapsed {
    transform: rotate(-90deg);
  }

  .section-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-top: 4px;
  }

  .cat-link,
  .country-link {
    color: var(--text-secondary);
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    transition: color 0.15s;
  }

  .cat-link:hover,
  .country-link:hover {
    color: var(--accent);
  }

  .empty {
    text-align: center;
    color: var(--text-secondary);
    padding: 40px 20px;
    font-size: 14px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: center;
  }

  .loading-text {
    color: var(--text-secondary);
    font-size: 14px;
  }

  .loading-spinner {
    display: flex;
    justify-content: center;
    padding: 40px;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .add-clue-btn {
    width: 100%;
    padding: 10px;
    border: 1px dashed var(--border);
    border-radius: var(--radius);
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 500;
    transition: all 0.15s;
  }

  .add-clue-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 5%, transparent);
  }

  @media (max-width: 640px) {
    .drawer {
      top: auto;
      bottom: 0;
      left: 0;
      right: 0;
      width: 100%;
      max-width: 100%;
      max-height: 70vh;
      border-left: none;
      border-top: 1px solid var(--border);
      border-radius: 16px 16px 0 0;
    }

    .drawer-header {
      padding: 16px;
    }

    .drawer-body {
      padding: 12px 16px;
    }
  }
</style>
