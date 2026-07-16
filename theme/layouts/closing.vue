<script setup lang="ts">
defineProps<{
  eyebrow?: string
  summary?: string
  actions?: string[]
  nextAction?: string
}>()
</script>

<template>
  <main class="slidev-layout governance-closing">
    <header>
      <div class="governance-eyebrow">{{ eyebrow }}</div>
      <slot />
      <p>{{ summary }}</p>
    </header>
    <section class="governance-closing__actions">
      <article v-for="(action, index) in actions" :key="action">
        <span>0{{ index + 1 }}</span>
        <strong>{{ action }}</strong>
      </article>
    </section>
    <footer>
      <span>NEXT</span>
      <strong>{{ nextAction }}</strong>
    </footer>
  </main>
</template>
