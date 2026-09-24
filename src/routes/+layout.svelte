<script>
  import '../app.css';
  import { isAdmin } from '$lib/stores/admin';
  import { theme } from '$lib/stores/theme';

  let { data, children } = $props();

  isAdmin.set(data.isAdmin);
  theme.init();
</script>

{@render children()}
