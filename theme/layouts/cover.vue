<script setup lang="ts">
defineProps<{ eyebrow?: string }>()
</script>

<template>
  <main class="slidev-layout governance-cover">
    <section class="governance-cover__content">
      <div class="governance-eyebrow">{{ eyebrow }}</div>
      <slot />
    </section>
    <div class="governance-cover__visual" aria-hidden="true">
      <span class="governance-cover__mark">AI</span>
    </div>
  </main>
</template>
