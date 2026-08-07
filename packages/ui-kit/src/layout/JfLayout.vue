<template>
  <div class="jf-layout">
    <!-- 顶部 -->
    <header class="jf-layout__header">
      <div class="jf-layout__brand" @click="select(menus[0]?.key)">
        <span class="jf-layout__logo">{{ logo || '🧊' }}</span>
        <span class="jf-layout__title">{{ title }}</span>
      </div>
      <div class="jf-layout__header-right">
        <slot name="header-right" />
      </div>
    </header>

    <div class="jf-layout__body">
      <!-- 左侧菜单 -->
      <aside class="jf-layout__sider">
        <nav class="jf-menu">
          <div
            v-for="m in visibleMenus"
            :key="m.key"
            class="jf-menu__item"
            :class="{ 'jf-menu__item--active': m.key === selectedKey }"
            @click="select(m.key)"
          >
            <span class="jf-menu__icon">{{ m.icon || '•' }}</span>
            <span>{{ m.title }}</span>
          </div>
        </nav>
      </aside>

      <!-- 内容区 -->
      <main class="jf-layout__content">
        <slot :current="current" />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Component } from 'vue'
import { useJeeflowUi } from '../provider'

defineOptions({ name: 'JfLayout' })

export interface JfMenuItem {
  /** 唯一 key（路由 path 或 id） */
  key: string
  title: string
  icon?: string
  /** 权限码：任一命中才显示（superAdmin 由宿主 hasPermission 处理） */
  perms?: string[]
  /** 页面组件（内容区渲染） */
  component?: Component
  /** 外部链接（iframe/跳转，与 component 二选一） */
  href?: string
}

const props = withDefaults(defineProps<{
  menus: JfMenuItem[]
  title?: string
  logo?: string
  /** 初始选中 key */
  defaultKey?: string
}>(), { title: 'jeeflow 流程中心' })

const emit = defineEmits<{
  select: [key: string]
}>()

const { can } = useJeeflowUi()

const selectedKey = ref(props.defaultKey ?? props.menus[0]?.key ?? '')

// 权限码过滤（宿主 can 未注入时默认全显）
const visibleMenus = computed(() =>
  props.menus.filter((m) => !m.perms || m.perms.length === 0 || can(m.perms))
)

const current = computed(() =>
  props.menus.find((m) => m.key === selectedKey.value) ?? null
)

watch(() => props.defaultKey, (k) => {
  if (k) selectedKey.value = k
})

function select(key: string) {
  if (!key) return
  const m = props.menus.find((x) => x.key === key)
  if (m?.href) {
    window.open(m.href, '_blank')
    return
  }
  selectedKey.value = key
  emit('select', key)
}
</script>

<style scoped>
.jf-layout { display: flex; flex-direction: column; height: 100vh; }
.jf-layout__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px; height: 56px; flex-shrink: 0;
  background: var(--jf-header-bg, #1a1a2e); color: #fff;
}
.jf-layout__brand { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.jf-layout__logo { font-size: 20px; }
.jf-layout__title { font-size: 17px; font-weight: 600; }
.jf-layout__header-right { display: flex; align-items: center; gap: 12px; }
.jf-layout__body { display: flex; flex: 1; min-height: 0; }
.jf-layout__sider {
  width: 200px; flex-shrink: 0; overflow-y: auto;
  background: var(--jf-sider-bg, #16213e); padding: 12px 8px;
}
.jf-menu__item {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-radius: 8px; cursor: pointer;
  color: #c8d0e0; font-size: 14px; transition: all .15s; margin-bottom: 2px;
}
.jf-menu__item:hover { background: rgba(255, 255, 255, .06); color: #fff; }
.jf-menu__item--active { background: var(--jf-primary, #1677ff); color: #fff; }
.jf-menu__icon { width: 18px; text-align: center; }
.jf-layout__content { flex: 1; min-width: 0; overflow-y: auto; background: var(--jf-content-bg, #f5f7fa); }
</style>
