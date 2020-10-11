<script lang="ts">
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let options: { name: string; goto: string }[];
</script>

{#each options as option}
  <button
    on:click={() => dispatch('chosen', option)}>{option.name}</button>
{/each}
