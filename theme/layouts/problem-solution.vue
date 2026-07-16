<script setup lang="ts">
defineProps<{
  problemTitle?: string
  solutionTitle?: string
}>()
</script>

<template>
  <main class="slidev-layout governance-problem-solution">
    <header class="governance-problem-solution__header"><slot /></header>
    <section class="governance-problem-solution__grid">
      <article class="governance-problem-solution__card governance-problem-solution__card--problem">
        <div class="governance-problem-solution__label">問題</div>
        <h2>{{ problemTitle }}</h2>
        <slot name="problem" />
      </article>
      <div class="governance-problem-solution__transition" aria-hidden="true">→</div>
      <article class="governance-problem-solution__card governance-problem-solution__card--solution">
        <div class="governance-problem-solution__label">解法</div>
        <h2>{{ solutionTitle }}</h2>
        <slot name="solution" />
      </article>
    </section>
  </main>
</template>
