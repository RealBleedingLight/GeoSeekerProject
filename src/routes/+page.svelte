<script>
  import Map from '$lib/components/Map.svelte';
  import CategoryBar from '$lib/components/CategoryBar.svelte';
  import AdminBar from '$lib/components/AdminBar.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import ClueDrawer from '$lib/components/ClueDrawer.svelte';
  import CategoryModal from '$lib/components/CategoryModal.svelte';
  import { isAdmin } from '$lib/stores/admin';

  let { data } = $props();

  let drawerOpen = $state(false);
  let drawerMode = $state('country');
  let selectedCountry = $state(null);
  let selectedCategorySlug = $state(null);
  let drawerData = $state(null);
  let drawerLoading = $state(false);
  let categoryModalOpen = $state(false);

  let countriesWithClues = $derived(
    new Set(data.countries.filter(c => c.clue_count > 0).map(c => c.code))
  );

  async function openCountry(code, name) {
    drawerMode = 'country';
    selectedCountry = { code, name };
    selectedCategorySlug = null;
    drawerLoading = true;
    drawerOpen = true;

    const res = await fetch(`/api/clues?country=${code}`);
    drawerData = await res.json();
    drawerLoading = false;
  }

  async function openCategory(slug) {
    drawerMode = 'category';
    selectedCategorySlug = slug;
    selectedCountry = null;
    drawerLoading = true;
    drawerOpen = true;

    const res = await fetch(`/api/clues?category=${slug}`);
    drawerData = await res.json();
    drawerLoading = false;
  }

  function closeDrawer() {
    drawerOpen = false;
    drawerData = null;
    selectedCountry = null;
    selectedCategorySlug = null;
  }

  async function refreshData() {
    const res = await fetch('/api/countries');
    data.countries = await res.json();

    if (drawerMode === 'country' && selectedCountry) {
      const r = await fetch(`/api/clues?country=${selectedCountry.code}`);
      drawerData = await r.json();
    } else if (drawerMode === 'category' && selectedCategorySlug) {
      const r = await fetch(`/api/clues?category=${selectedCategorySlug}`);
      drawerData = await r.json();
    }
  }

  async function refreshCategories() {
    const res = await fetch('/api/categories');
    data.categories = await res.json();
  }
</script>

<div class="app">
  <header class="topbar">
    <a href="/" class="logo">GeoSeeker</a>
    <CategoryBar
      categories={data.categories}
      activeSlug={drawerMode === 'category' ? selectedCategorySlug : null}
      onSelect={openCategory}
    />
    <div class="topbar-actions">
      {#if $isAdmin}
        <button class="manage-cats-btn" onclick={() => (categoryModalOpen = true)}>
          Categories
        </button>
      {/if}
      <ThemeToggle />
      <AdminBar />
    </div>
  </header>

  <Map {countriesWithClues} onCountryClick={openCountry} />

  <ClueDrawer
    open={drawerOpen}
    mode={drawerMode}
    data={drawerData}
    loading={drawerLoading}
    isAdmin={$isAdmin}
    onClose={closeDrawer}
    onCategoryClick={openCategory}
    onCountryClick={openCountry}
    onDataChanged={refreshData}
  />

  <CategoryModal
    open={categoryModalOpen}
    onClose={() => (categoryModalOpen = false)}
    onChanged={refreshCategories}
  />
</div>

<style>
  .app {
    height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }

  .topbar {
    height: var(--topbar-height);
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 0 20px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    z-index: 1000;
    flex-shrink: 0;
  }

  .logo {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    text-decoration: none;
    white-space: nowrap;
  }

  .topbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
    flex-shrink: 0;
  }

  .manage-cats-btn {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
    padding: 6px 12px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
  }

  .manage-cats-btn:hover {
    color: var(--text-primary);
    background: var(--surface-hover);
  }

  @media (max-width: 640px) {
    .topbar {
      padding: 0 12px;
      gap: 8px;
    }

    .logo {
      font-size: 16px;
    }

    .manage-cats-btn {
      display: none;
    }
  }
</style>
