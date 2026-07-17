<script setup lang="ts">
defineProps<{
  variant?: 'cover' | 'statement' | 'narrative' | 'list' | 'table' | 'code' | 'diagram' | 'dense'
  blocks?: Array<{
    kind: 'subtitle' | 'paragraph' | 'bullet' | 'numbered' | 'quote' | 'code' | 'small' | 'table-row' | 'mermaid'
    text?: string
    cells?: string[]
    diagramSrc?: string
  }>
}>()
</script>

<template>
  <main class="slidev-layout governance-source" :class="`governance-source--${variant ?? 'narrative'}`">
    <header class="governance-source__header">
      <slot />
    </header>
    <section class="governance-source__body">
      <template v-for="(block, index) in blocks" :key="index">
        <h2 v-if="block.kind === 'subtitle'" class="governance-source__subtitle">{{ block.text }}</h2>
        <p v-else-if="block.kind === 'paragraph'" class="governance-source__paragraph">{{ block.text }}</p>
        <p v-else-if="block.kind === 'bullet'" class="governance-source__bullet">{{ block.text }}</p>
        <p v-else-if="block.kind === 'numbered'" class="governance-source__numbered">{{ block.text }}</p>
        <blockquote v-else-if="block.kind === 'quote'" class="governance-source__quote">{{ block.text }}</blockquote>
        <pre v-else-if="block.kind === 'code'" class="governance-source__code">{{ block.text }}</pre>
        <small v-else-if="block.kind === 'small'" class="governance-source__small">{{ block.text }}</small>
        <img v-else-if="block.kind === 'mermaid'" class="governance-source__diagram" :src="block.diagramSrc" alt="" />
        <div
          v-else-if="block.kind === 'table-row'"
          class="governance-source__table-row"
          :style="{ gridTemplateColumns: `repeat(${block.cells?.length ?? 1}, minmax(0, 1fr))` }"
        >
          <span v-for="(cell, cellIndex) in block.cells" :key="cellIndex">{{ cell }}</span>
        </div>
      </template>
    </section>
  </main>
</template>
