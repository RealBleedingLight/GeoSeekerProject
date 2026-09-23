<script>
  import '../app.css';
  import { isAdmin } from '$lib/stores/admin';

  let { data, children } = $props();

  isAdmin.set(data.isAdmin);
</script>

{@render children()}
