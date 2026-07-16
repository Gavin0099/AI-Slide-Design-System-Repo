<script setup lang="ts">
defineProps<{
  leftTitle?: string
  rightTitle?: string
  accent?: string
}>()
</script>

<template>
  <main class="slidev-layout governance-comparison" :data-accent="accent">
    <header class="governance-comparison__header"><slot /></header>
    <section class="governance-comparison__grid">
      <article class="governance-comparison__column">
        <div class="governance-comparison__title">{{ leftTitle }}</div>
        <slot name="left" />
      </article>
      <article class="governance-comparison__column governance-comparison__column--right">
        <div class="governance-comparison__title">{{ rightTitle }}</div>
        <slot name="right" />
      </article>
    </section>
  </main>
</template>
