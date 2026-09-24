<script>
  import { onMount, onDestroy } from 'svelte';
  import { theme } from '$lib/stores/theme';

  let { countriesWithClues = new Set(), onCountryClick = () => {} } = $props();

  let mapEl;
  let map;
  let tileLayer;
  let geoJsonLayer;
  let L;
  let currentTheme = 'light';

  const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const ATTRIBUTION = '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>';

  function getStyle(feature) {
    const code = feature.properties?.['ISO3166-1-Alpha-2'];
    const hasClues = countriesWithClues.has(code);

    if (currentTheme === 'dark') {
      return {
        color: '#30363d',
        weight: 1,
        fillColor: hasClues ? '#3fb68b' : '#1a7f5a',
        fillOpacity: hasClues ? 0.55 : 0.25
      };
    }
    return {
      color: '#dee2e6',
      weight: 1,
      fillColor: hasClues ? '#2d6a4f' : '#94d2bd',
      fillOpacity: hasClues ? 0.55 : 0.3
    };
  }

  function updateTileTheme(t) {
    if (!mapEl) return;
    const tilePane = mapEl.querySelector('.leaflet-tile-pane');
    if (tilePane) {
      tilePane.style.filter = t === 'dark' ? 'invert(1) hue-rotate(180deg) brightness(0.8) contrast(1.2)' : 'none';
    }
  }

  onMount(async () => {
    const leaflet = await import('leaflet');
    L = leaflet.default || leaflet;
    await import('leaflet/dist/leaflet.css');

    const unsub = theme.subscribe(t => (currentTheme = t));

    map = L.map(mapEl, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 7,
      zoomControl: false,
      attributionControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.attribution({ position: 'bottomleft', prefix: false })
      .addAttribution(ATTRIBUTION)
      .addTo(map);

    tileLayer = L.tileLayer(TILE_URL, { attribution: ATTRIBUTION }).addTo(map);
    updateTileTheme(currentTheme);

    const response = await fetch('/countries.geojson');
    const geojson = await response.json();

    geoJsonLayer = L.geoJSON(geojson, {
      style: getStyle,
      onEachFeature(feature, layer) {
        const code = feature.properties?.['ISO3166-1-Alpha-2'];
        const name = feature.properties?.name;
        if (!code) return;

        layer.bindTooltip(name, {
          sticky: true,
          direction: 'top',
          className: 'country-tooltip'
        });

        layer.on('click', () => onCountryClick(code, name));

        layer.on('mouseover', () => {
          layer.setStyle({
            weight: 2,
            fillOpacity: 0.7,
            fillColor: currentTheme === 'dark' ? '#2ea77a' : '#52b788'
          });
          layer.bringToFront();
        });

        layer.on('mouseout', () => {
          geoJsonLayer.resetStyle(layer);
        });
      }
    }).addTo(map);

    unsub();
  });

  onDestroy(() => {
    map?.remove();
  });

  $effect(() => {
    const unsub = theme.subscribe(t => {
      currentTheme = t;
      updateTileTheme(t);
      if (geoJsonLayer) geoJsonLayer.setStyle(getStyle);
    });
    return unsub;
  });
</script>

<div class="map" bind:this={mapEl}></div>

<style>
  .map {
    position: absolute;
    inset: 0;
    top: var(--topbar-height);
    z-index: 0;
  }

  :global(.country-tooltip) {
    background: var(--surface) !important;
    color: var(--text-primary) !important;
    border: 1px solid var(--border) !important;
    border-radius: var(--radius-sm) !important;
    padding: 4px 10px !important;
    font-family: 'Inter', system-ui, sans-serif !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    box-shadow: var(--shadow) !important;
  }

  :global(.country-tooltip::before) {
    border-top-color: var(--border) !important;
  }

  :global(.leaflet-control-zoom a) {
    background: var(--surface) !important;
    color: var(--text-primary) !important;
    border-color: var(--border) !important;
  }

  :global(.leaflet-control-zoom a:hover) {
    background: var(--surface-hover) !important;
  }
</style>
