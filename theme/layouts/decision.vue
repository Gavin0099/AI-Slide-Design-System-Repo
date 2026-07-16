<script setup lang="ts">
defineProps<{
  eyebrow?: string
  decision?: string
  reasons?: string[]
  owner?: string
  nextAction?: string
}>()
</script>

<template>
  <main class="slidev-layout governance-decision">
    <header class="governance-decision__header">
      <div class="governance-eyebrow">{{ eyebrow }}</div>
      <slot />
    </header>
    <section class="governance-decision__statement">
      <span>DECISION</span>
      <p>{{ decision }}</p>
    </section>
    <section class="governance-decision__details">
      <div class="governance-decision__reasons">
        <article v-for="(reason, index) in reasons" :key="reason">
          <span>0{{ index + 1 }}</span>
          <strong>{{ reason }}</strong>
        </article>
      </div>
      <aside>
        <div>
          <span>OWNER</span>
          <strong>{{ owner }}</strong>
        </div>
        <div>
          <span>NEXT ACTION</span>
          <strong>{{ nextAction }}</strong>
        </div>
      </aside>
    </section>
  </main>
</template>
