<template>
  <!-- embed 壳：复用 demo 同款菜单装配，白标（logo/站点名/主题色）由宿主注入 -->
  <JfLayout :menus="menus" :title="store.siteName" :logo="store.logo" :default-key="defaultKey" @select="onSelect">
    <template #header-right>
      <span class="embed-tag">embed</span>
      <span class="embed-operator">{{ store.operator }}</span>
    </template>

    <!-- 内容区：按菜单渲染页面组件 -->
    <component :is="currentComponent" :key="currentKey" @goto="onSelect" />
  </JfLayout>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import {
  JfLayout,
  JfWorkbenchPage, JfApplyListPage, JfMyInstancePage, JfTodoPage, JfDonePage, JfCcListPage,
  JfProcessDefinePage, JfProcessDesignPage, JfSurrogatePage,
} from '@mldong/jeeflow-ui'

const store = inject('embedStore')

// 菜单装配与 demo 同款（异栈系统接入样板：宿主按需裁剪）
const menus = [
  { key: 'workbench', title: '工作台', icon: 'home', component: JfWorkbenchPage },
  { key: 'apply', title: '发起申请', icon: 'apply', component: JfApplyListPage, perms: ['wf:processDesign:listByType'] },
  { key: 'todo', title: '我的待办', icon: 'todo', component: JfTodoPage, perms: ['wf:processTask:todoList'] },
  { key: 'done', title: '我的已办', icon: 'done', component: JfDonePage, perms: ['wf:processTask:doneList'] },
  { key: 'mine', title: '我发起的', icon: 'mine', component: JfMyInstancePage, perms: ['wf:processInstance'] },
  { key: 'cc', title: '我的抄送', icon: 'cc', component: JfCcListPage, perms: ['wf:processInstance:ccList'] },
  { key: 'define', title: '流程定义', icon: 'define', component: JfProcessDefinePage, perms: ['wf:processDefine'] },
  { key: 'design', title: '流程设计', icon: 'design', component: JfProcessDesignPage, perms: ['wf:processDesign'] },
  { key: 'surrogate', title: '我的委托', icon: 'surrogate', component: JfSurrogatePage, perms: ['wf:processSurrogate'] },
]

const defaultKey = 'workbench'
const currentKey = ref(defaultKey)
const currentComponent = computed(() => {
  const m = menus.find((x) => x.key === currentKey.value)
  return m?.component || JfWorkbenchPage
})

function onSelect(key) {
  currentKey.value = key
}
</script>

<style>
.embed-tag {
  padding: 2px 8px; border-radius: 4px; font-size: 11px;
  background: var(--jf-primary-soft, #e8f1ff); color: var(--jf-primary, #1677ff);
}
.embed-operator { font-size: 13px; color: var(--jf-text-2, #4b5563); }
</style>
