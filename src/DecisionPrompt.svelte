<script lang="ts">
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let options: { name: string; goto: string }[];
  export let timeout: number;
</script>

timeout: {timeout}
{#each options as option}
  <button
    on:click={() => dispatch('choose', option)}>{option.name}</button>
{/each}
