<script setup lang="ts">
defineProps<{
  eyebrow?: string
  claim?: string
  status?: 'verified' | 'detected' | 'unproven'
  sources?: string[]
}>()
</script>

<template>
  <main class="slidev-layout governance-evidence-layout">
    <header class="governance-evidence-layout__header">
      <div class="governance-eyebrow">{{ eyebrow }}</div>
      <slot />
    </header>
    <section class="governance-evidence-layout__claim">
      <ClaimLevel :status="status" />
      <p>{{ claim }}</p>
    </section>
    <section class="governance-evidence-layout__sources">
      <article v-for="(source, index) in sources" :key="source">
        <span>0{{ index + 1 }}</span>
        <strong>{{ source }}</strong>
      </article>
    </section>
  </main>
</template>
