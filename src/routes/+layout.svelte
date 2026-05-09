<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';

  let { children } = $props();

  onMount(() => {
    (window as Window & { __removeSplash?: () => void }).__removeSplash?.();
  });
</script>

{@render children()}
