<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ status?: 'verified' | 'detected' | 'unproven' }>(), {
  status: 'unproven',
})

const labels = {
  verified: 'VERIFIED / 已驗證',
  detected: 'DETECTED / 已偵測',
  unproven: 'UNPROVEN / 未證明',
}

const label = computed(() => labels[props.status])
</script>

<template>
  <span class="claim-level" :class="`claim-level--${status}`">{{ label }}</span>
</template>

<style scoped>
.claim-level {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 0 16px;
  border-radius: 999px;
  color: white;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.claim-level--verified { background: var(--slide-success); }
.claim-level--detected { background: var(--slide-warning); }
.claim-level--unproven { background: var(--slide-danger); }
</style>
