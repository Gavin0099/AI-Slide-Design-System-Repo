<script setup lang="ts">
defineProps<{
  eyebrow?: string
  metrics?: Array<{ label: string, value: string, detail: string }>
}>()
</script>

<template>
  <main class="slidev-layout governance-metrics">
    <header class="governance-metrics__header">
      <div class="governance-eyebrow">{{ eyebrow }}</div>
      <slot />
    </header>
    <section class="governance-metrics__grid" :style="{ '--metric-columns': metrics?.length ?? 1 }">
      <MetricCard
        v-for="(metric, index) in metrics"
        :key="metric.label"
        v-bind="metric"
        :index="index"
      />
    </section>
  </main>
</template>
