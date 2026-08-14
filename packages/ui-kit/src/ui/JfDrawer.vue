<template>
  <Teleport to="body">
    <div v-if="show" class="jf-drawer-root" :class="{ 'jf-drawer-root--open': opening }" @click.self="handleMaskClick">
      <div class="jf-drawer" :class="{ 'jf-drawer--open': opening }" :style="{ width }">
        <div class="jf-drawer__header">
          <span class="jf-drawer__title">{{ title }}</span>
          <slot name="header-extra" />
          <button class="jf-drawer__close" @click="handleClose">&times;</button>
        </div>
        <div class="jf-drawer__body">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { watch, ref, onMounted, onBeforeUnmount } from 'vue'

defineOptions({ name: 'JfDrawer' })

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: String, default: '780px' },
  maskClosable: { type: Boolean, default: true },
})

const emit = defineEmits(['update:visible', 'close'])

const show = ref(false)
const opening = ref(false)
const closing = ref(false)

function open() {
  closing.value = false
  show.value = true
  document.body.style.overflow = 'hidden'
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { opening.value = true })
  })
}

function close() {
  if (!show.value || closing.value) return
  closing.value = true
  opening.value = false
  setTimeout(() => {
    show.value = false
    closing.value = false
    document.body.style.overflow = ''
    emit('update:visible', false)
    emit('close')
  }, 260)
}

function handleClose() { close() }
function handleMaskClick() { if (props.maskClosable) close() }

function handleKeydown(e: KeyboardEvent) {
  if (!show.value) return
  if (e.key === 'Escape') close()
}

watch(() => props.visible, (v) => { if (v) open(); else close() }, { immediate: true })

onMounted(() => document.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => { document.removeEventListener('keydown', handleKeydown); document.body.style.overflow = '' })
</script>

<style scoped>
/* 主题走 CSS 变量：宿主可覆盖 --jf-* 变量统一换肤 */
.jf-drawer-root {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0, 0, 0, 0); transition: background .25s ease; pointer-events: none;
}
.jf-drawer-root--open { background: var(--jf-mask-bg, rgba(0, 0, 0, .35)); pointer-events: auto; }
.jf-drawer {
  position: absolute; top: 0; right: 0; bottom: 0;
  background: var(--jf-bg, #fff);
  box-shadow: -4px 0 20px rgba(0, 0, 0, .12); display: flex; flex-direction: column;
  transform: translateX(100%); transition: transform .25s cubic-bezier(.4, 0, .2, 1);
}
.jf-drawer--open { transform: translateX(0); }
.jf-drawer__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; border-bottom: 1px solid var(--jf-border, #f0f0f0); flex-shrink: 0; gap: 8px;
}
.jf-drawer__title { font-size: 15px; font-weight: 600; color: var(--jf-text, #1f1f1f); }
.jf-drawer__close {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; cursor: pointer; font-size: 20px;
  color: var(--jf-text-muted, #999); border-radius: 6px;
}
.jf-drawer__close:hover { background: var(--jf-hover-bg, #f5f5f5); color: var(--jf-text, #333); }
.jf-drawer__body { padding: 16px; overflow-y: auto; flex: 1; }
</style>
