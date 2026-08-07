<template>
  <!-- 演示站壳：顶部（品牌/后端切换/用户切换）+ JfLayout 管理系统形态 -->
  <JfLayout :menus="menus" title="jeeflow 流程中心" :default-key="defaultKey" @select="onSelect">
    <template #header-right>
      <!-- 后端切换（demo 特性） -->
      <div class="demo-backend">
        <select v-model="backend" class="demo-select" @change="switchBackend">
          <option v-for="b in backends" :key="b.value" :value="b.value">{{ b.label }}</option>
        </select>
      </div>
      <!-- 用户切换（demo 特性） -->
      <div class="demo-users">
        <button
          v-for="u in quickUsers"
          :key="u"
          class="demo-user"
          :class="{ active: currentUser === u }"
          @click="switchUser(u)"
        >{{ userLabels[u] || u }}</button>
      </div>
    </template>

    <!-- 内容区：按菜单渲染页面组件 -->
    <component :is="currentComponent" :key="currentKey" />
  </JfLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { JfLayout } from '@mldong/jeeflow-ui'
import {
  JfApplyListPage, JfMyInstancePage, JfTodoPage, JfDonePage, JfCcListPage,
  JfProcessDefinePage, JfProcessDesignPage, JfSurrogatePage,
} from '@mldong/jeeflow-ui'

// ── demo 特性状态 ──
const backends = [
  { label: '🐍 Python :8100', value: 'http://localhost:8100' },
  { label: '☕ Java :8080', value: 'http://localhost:8080' },
  { label: '🔷 Go :8081', value: 'http://localhost:8081' },
  { label: '🟢 Node :8082', value: 'http://localhost:8082' },
]
const backend = ref(localStorage.getItem('jeeflow_backend') || backends[0].value)
const currentUser = ref(localStorage.getItem('jeeflow_user') || 'user1')
const quickUsers = ['user1', 'leader', 'manager', 'boss', 'director', 'userA', 'userB', 'userC']
const userLabels = { leader: '组长', manager: '经理', boss: '老板', director: '总监' }

function switchBackend() {
  localStorage.setItem('jeeflow_backend', backend.value)
  location.reload()
}
function switchUser(u) {
  currentUser.value = u
  localStorage.setItem('jeeflow_user', u)
  location.reload()
}

// ── 菜单（对齐 vben5-wf 8 项）──
const menus = [
  { key: 'apply', title: '发起申请', icon: '🚀', component: JfApplyListPage, perms: ['wf:processDesign:listByType'] },
  { key: 'todo', title: '我的待办', icon: '📋', component: JfTodoPage, perms: ['wf:processTask:todoList'] },
  { key: 'done', title: '我的已办', icon: '📗', component: JfDonePage, perms: ['wf:processTask:doneList'] },
  { key: 'mine', title: '我发起的', icon: '📝', component: JfMyInstancePage, perms: ['wf:processInstance'] },
  { key: 'cc', title: '我的抄送', icon: '📨', component: JfCcListPage, perms: ['wf:processInstance:ccList'] },
  { key: 'define', title: '流程定义', icon: '📦', component: JfProcessDefinePage, perms: ['wf:processDefine'] },
  { key: 'design', title: '流程设计', icon: '🎨', component: JfProcessDesignPage, perms: ['wf:processDesign'] },
  { key: 'surrogate', title: '我的委托', icon: '🔁', component: JfSurrogatePage, perms: ['wf:processSurrogate'] },
]

const defaultKey = computed(() => {
  const saved = localStorage.getItem('jeeflow_menu') || 'apply'
  return menus.some((m) => m.key === saved) ? saved : 'apply'
})

const currentKey = ref(defaultKey.value)
const currentComponent = computed(() => {
  const m = menus.find((x) => x.key === currentKey.value)
  return m?.component || JfApplyListPage
})

function onSelect(key) {
  currentKey.value = key
  localStorage.setItem('jeeflow_menu', key)
}
</script>

<style>
@import './style.css';

.demo-backend { position: relative; }
.demo-select {
  padding: 5px 10px; border-radius: 6px; border: 1px solid #555;
  background: #16213e; color: #eee; font-size: 13px; cursor: pointer; outline: none;
}
.demo-users { display: flex; gap: 4px; }
.demo-user {
  padding: 4px 9px; border-radius: 6px; border: 1px solid #444;
  background: transparent; color: #c8d0e0; font-size: 12px; cursor: pointer; transition: all .15s;
}
.demo-user:hover { border-color: #1677ff; color: #fff; }
.demo-user.active { background: #1677ff; border-color: #1677ff; color: #fff; }
</style>
