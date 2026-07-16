<script setup lang="ts">
defineProps<{
  eyebrow?: string
  layers?: Array<{ title: string, detail: string }>
}>()
</script>

<template>
  <main class="slidev-layout governance-architecture">
    <header class="governance-architecture__header">
      <div class="governance-eyebrow">{{ eyebrow }}</div>
      <slot />
    </header>
    <section class="governance-architecture__layers">
      <article v-for="(layer, index) in layers" :key="layer.title" class="governance-architecture__layer">
        <div class="governance-architecture__index">L{{ index + 1 }}</div>
        <h2>{{ layer.title }}</h2>
        <p>{{ layer.detail }}</p>
      </article>
    </section>
  </main>
</template>
