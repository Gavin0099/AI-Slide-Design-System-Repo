<script setup lang="ts">
defineProps<{
  label: string
  value: string
  detail: string
  index: number
}>()
</script>

<template>
  <article class="metric-card">
    <div class="metric-card__topline">
      <span>{{ label }}</span>
      <span>{{ String(index + 1).padStart(2, '0') }}</span>
    </div>
    <strong>{{ value }}</strong>
    <p>{{ detail }}</p>
  </article>
</template>

<style scoped>
.metric-card {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 290px;
  padding: 30px 32px;
  border: 1px solid var(--slide-line);
  border-top: 6px solid var(--slide-accent);
  border-radius: var(--slide-radius-lg);
  background: rgb(255 255 255 / 94%);
  box-shadow: 0 14px 44px rgb(31 47 74 / 8%);
}

.metric-card:nth-child(2) { border-top-color: var(--slide-cyan); }
.metric-card:nth-child(3) { border-top-color: var(--slide-success); }

.metric-card__topline {
  display: flex;
  justify-content: space-between;
  color: var(--slide-muted);
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.metric-card strong {
  align-self: center;
  color: var(--slide-ink);
  font-size: 66px;
  font-weight: 800;
  letter-spacing: -0.045em;
}

.metric-card p {
  color: var(--slide-muted);
  font-size: 18px;
}
</style>
