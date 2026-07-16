<script setup lang="ts">
import EvidenceBadge from '../components/EvidenceBadge.vue'
import VerificationGap from '../components/VerificationGap.vue'

defineProps<{
  eyebrow?: string
  visual?: 'verification-gap'
}>()
</script>

<template>
  <main class="slidev-layout governance-key-message">
    <div class="governance-eyebrow">{{ eyebrow }}</div>
    <section class="governance-key-message__body">
      <div><slot /></div>
      <VerificationGap v-if="visual === 'verification-gap'" />
    </section>
    <footer class="governance-evidence">
      <EvidenceBadge />
      <div><slot name="evidence" /></div>
    </footer>
  </main>
</template>
