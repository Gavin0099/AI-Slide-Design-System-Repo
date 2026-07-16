<script setup lang="ts">
withDefaults(defineProps<{ label?: string }>(), {
  label: '證據',
})
</script>

<template>
  <span class="evidence-badge">{{ label }}</span>
</template>

<style scoped>
.evidence-badge {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  background: var(--slide-accent);
  color: white;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
</style>
