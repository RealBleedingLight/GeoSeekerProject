import { writable } from 'svelte/store';
import { browser } from '$app/environment';

function createThemeStore() {
  const initial = browser
    ? localStorage.getItem('theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : 'light';

  const { subscribe, set, update } = writable(initial);

  return {
    subscribe,
    toggle() {
      update(current => {
        const next = current === 'dark' ? 'light' : 'dark';
        if (browser) {
          localStorage.setItem('theme', next);
          document.documentElement.classList.toggle('dark', next === 'dark');
        }
        return next;
      });
    },
    init() {
      if (browser) {
        const saved = localStorage.getItem('theme');
        const value = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        set(value);
        document.documentElement.classList.toggle('dark', value === 'dark');
      }
    }
  };
}

export const theme = createThemeStore();
