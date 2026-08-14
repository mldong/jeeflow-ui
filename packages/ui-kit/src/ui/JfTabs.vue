<template>
  <div class="jf-tabs">
    <div class="jf-tabs__nav" role="tablist">
      <button
        v-for="t in tabs"
        :key="t.key"
        type="button"
        role="tab"
        class="jf-tabs__tab"
        :class="{ 'jf-tabs__tab--active': modelValue === t.key }"
        :aria-selected="modelValue === t.key"
        @click="emit('update:modelValue', t.key)"
      >{{ t.label }}</button>
    </div>
    <div class="jf-tabs__body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'JfTabs' })

defineProps<{
  modelValue: string
  tabs: Array<{ key: string; label: string }>
}>()

const emit = defineEmits<{
  'update:modelValue': [key: string]
}>()
</script>
