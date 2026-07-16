<script setup lang="ts">
defineProps<{
  eyebrow?: string
  steps?: Array<{ title: string, detail: string }>
}>()
</script>

<template>
  <main class="slidev-layout governance-process">
    <header class="governance-process__header">
      <div class="governance-eyebrow">{{ eyebrow }}</div>
      <slot />
    </header>
    <section
      class="governance-process__steps"
      :style="{ '--process-columns': steps?.length ?? 1 }"
    >
      <article v-for="(step, index) in steps" :key="step.title" class="governance-process__step">
        <div class="governance-process__number">{{ String(index + 1).padStart(2, '0') }}</div>
        <h2>{{ step.title }}</h2>
        <p>{{ step.detail }}</p>
      </article>
    </section>
  </main>
</template>
