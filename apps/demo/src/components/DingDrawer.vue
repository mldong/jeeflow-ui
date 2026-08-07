<template>
  <Teleport to="body">
    <div v-if="show" class="ding-drawer-root" :class="{ 'ding-drawer-root--open': opening }" @click.self="handleMaskClick">
      <div class="ding-drawer" :class="{ 'ding-drawer--open': opening }" :style="{ width: width }">
        <div class="ding-drawer__header">
          <span class="ding-drawer__title">{{ title }}</span>
          <button class="ding-drawer__close" @click="handleClose">&times;</button>
        </div>
        <div class="ding-drawer__body">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { watch, ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: String, default: '780px' },
  maskClosable: { type: Boolean, default: true },
})

const emit = defineEmits(['update:visible', 'close'])

const show = ref(false)
const opening = ref(false)

function open() {
  show.value = true
  document.body.style.overflow = 'hidden'
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { opening.value = true })
  })
}

function close() {
  opening.value = false
  setTimeout(() => {
    show.value = false
    document.body.style.overflow = ''
    emit('update:visible', false)
    emit('close')
  }, 260)
}

function handleClose() { close() }
function handleMaskClick() { if (props.maskClosable) close() }

function handleKeydown(e) {
  if (!show.value) return
  if (e.key === 'Escape') close()
}

watch(() => props.visible, (v) => { if (v) open() }, { immediate: true })

onMounted(() => document.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => { document.removeEventListener('keydown', handleKeydown); document.body.style.overflow = '' })
</script>

<style scoped>
.ding-drawer-root {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0); transition: background .25s ease; pointer-events: none;
}
.ding-drawer-root--open { background: rgba(0,0,0,.35); pointer-events: auto; }
.ding-drawer {
  position: absolute; top: 0; right: 0; bottom: 0; background: #fff;
  box-shadow: -4px 0 20px rgba(0,0,0,.12); display: flex; flex-direction: column;
  transform: translateX(100%); transition: transform .25s cubic-bezier(.4,0,.2,1);
}
.ding-drawer--open { transform: translateX(0); }
.ding-drawer__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; border-bottom: 1px solid #f0f0f0; flex-shrink: 0;
}
.ding-drawer__title { font-size: 15px; font-weight: 600; color: #1f1f1f; }
.ding-drawer__close {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; cursor: pointer; font-size: 20px; color: #999; border-radius: 6px;
}
.ding-drawer__close:hover { background: #f5f5f5; color: #333; }
.ding-drawer__body { padding: 16px; overflow-y: auto; flex: 1; }
</style>
