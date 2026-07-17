<script setup lang="ts">
defineProps<{
  eyebrow?: string
  subtitle?: string
  diagramKind?: 'flowchart' | 'sequence'
  diagramSrc?: string
  caption?: string
}>()
</script>

<template>
  <main class="slidev-layout governance-mermaid" :class="`governance-mermaid--${diagramKind ?? 'flowchart'}`">
    <header>
      <p>{{ eyebrow }}</p>
      <slot />
      <div v-if="subtitle" class="governance-mermaid__subtitle">{{ subtitle }}</div>
    </header>
    <figure>
      <img :src="diagramSrc" alt="" />
      <figcaption v-if="caption">{{ caption }}</figcaption>
    </figure>
  </main>
</template>
