<template>
  <!-- 演示站壳：顶部（品牌/后端分段切换/用户卡）+ JfLayout 管理系统形态 -->
  <JfLayout :menus="menus" title="jeeflow 流程中心" :default-key="defaultKey" @select="onSelect">
    <template #header-right>
      <!-- 后端切换：分段控件（SPA 热切换，不 reload） -->
      <div class="demo-segment">
        <button
          v-for="b in backends"
          :key="b.value"
          class="demo-segment__item"
          :class="{ active: backend === b.value }"
          :title="b.value"
          @click="switchBackend(b.value)"
        >{{ b.label }}</button>
      </div>
      <!-- 用户切换：下拉用户卡（头像+姓名+岗位，SPA 热切换） -->
      <div class="demo-userbox" @click.stop>
        <button class="demo-usercard" @click="userOpen = !userOpen">
          <span class="demo-avatar" :style="{ background: avatarColor(currentUser) }">{{ avatarChar(currentUser) }}</span>
          <span class="demo-usercard__meta">
            <span class="demo-usercard__name">{{ userOf(currentUser).realName }}</span>
            <span class="demo-usercard__post">{{ userOf(currentUser).postName }}</span>
          </span>
          <span class="demo-usercard__caret">▾</span>
        </button>
        <div v-if="userOpen" class="demo-usermenu">
          <div
            v-for="u in DEMO_USERS"
            :key="u.userId"
            class="demo-usermenu__item"
            :class="{ active: currentUser === u.userId }"
            @click="switchUser(u.userId)"
          >
            <span class="demo-avatar" :style="{ background: avatarColor(u.userId) }">{{ u.realName[0] }}</span>
            <span class="demo-usermenu__meta">
              <span class="demo-usermenu__name">{{ u.realName }}<span class="demo-usermenu__id">{{ u.userId }}</span></span>
              <span class="demo-usermenu__post">{{ u.deptName }} · {{ u.postName }}</span>
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- 内容区：按菜单渲染页面组件（refreshTick 变化 → 重挂载刷新数据） -->
    <component :is="currentComponent" :key="`${currentKey}:${refreshTick}`" @goto="onSelect" />
  </JfLayout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { JfLayout } from '@mldong/jeeflow-ui'
import {
  JfWorkbenchPage, JfApplyListPage, JfMyInstancePage, JfTodoPage, JfDonePage, JfCcListPage,
  JfProcessDefinePage, JfProcessDesignPage, JfSurrogatePage,
} from '@mldong/jeeflow-ui'
import { DEMO_USERS } from './main.js'

// ── demo 特性状态 ──
const backends = [
  { label: 'Python :8100', value: 'http://localhost:8100' },
  { label: 'Java :8080', value: 'http://localhost:8080' },
  { label: 'Go :8081', value: 'http://localhost:8081' },
  { label: 'Node :8082', value: 'http://localhost:8082' },
]
const backend = ref(localStorage.getItem('jeeflow_backend') || backends[0].value)
const currentUser = ref(localStorage.getItem('jeeflow_user') || 'user1')
const userOpen = ref(false)
const refreshTick = ref(0)

function userOf(userId) {
  return DEMO_USERS.find((u) => u.userId === userId) || { realName: userId, postName: '-', deptName: '-' }
}

// 头像：姓名首字 + 按 userId 稳定取色
const AVATAR_COLORS = ['#1677ff', '#722ed1', '#13c2c2', '#52c41a', '#fa8c16', '#eb2f96', '#2f54eb', '#faad14']
function avatarColor(userId) {
  let h = 0
  for (const c of userId) h = (h * 31 + c.codePointAt(0)) % 997
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
function avatarChar(userId) {
  return userOf(userId).realName[0] || userId[0]
}

// 热切换：只改 localStorage + 重挂载当前页（api baseUrl/operator 懒求值，无需 reload）
function switchBackend(v) {
  if (backend.value === v) return
  backend.value = v
  localStorage.setItem('jeeflow_backend', v)
  refreshTick.value++
}
function switchUser(userId) {
  currentUser.value = userId
  localStorage.setItem('jeeflow_user', userId)
  userOpen.value = false
  refreshTick.value++
}

function onClickOutside() {
  userOpen.value = false
}
onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))

// ── 菜单（工作台 + 对齐 vben5-wf 8 项，图标为 JfIcon 名）──
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

const defaultKey = computed(() => {
  const saved = localStorage.getItem('jeeflow_menu') || 'workbench'
  return menus.some((m) => m.key === saved) ? saved : 'workbench'
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

/* 后端分段控件 */
.demo-segment {
  display: inline-flex; padding: 2px; border-radius: 8px;
  background: var(--jf-hover, #f2f4f7); border: 1px solid var(--jf-border, #e8eaed);
}
.demo-segment__item {
  padding: 4px 12px; border: none; border-radius: 6px; background: transparent;
  color: var(--jf-text-2, #4b5563); font-size: 12px; cursor: pointer; transition: all .15s;
}
.demo-segment__item:hover { color: var(--jf-primary, #1677ff); }
.demo-segment__item.active {
  background: #fff; color: var(--jf-primary, #1677ff); font-weight: 500;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .1);
}

/* 用户卡 */
.demo-userbox { position: relative; }
.demo-avatar {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 50%; color: #fff; font-size: 13px; flex-shrink: 0;
}
.demo-usercard {
  display: flex; align-items: center; gap: 8px; padding: 4px 10px 4px 6px;
  border: 1px solid var(--jf-border, #e8eaed); border-radius: 8px; background: #fff; cursor: pointer; transition: all .15s;
}
.demo-usercard:hover { border-color: var(--jf-primary, #1677ff); }
.demo-usercard__meta { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.25; }
.demo-usercard__name { font-size: 13px; color: var(--jf-text, #1f2937); font-weight: 500; }
.demo-usercard__post { font-size: 11px; color: var(--jf-muted, #9ca3af); }
.demo-usercard__caret { font-size: 10px; color: var(--jf-muted, #9ca3af); }

/* 用户下拉菜单 */
.demo-usermenu {
  position: absolute; right: 0; top: calc(100% + 6px); z-index: 100;
  width: 240px; padding: 6px; border-radius: 10px;
  background: #fff; border: 1px solid var(--jf-border, #e8eaed);
  box-shadow: 0 8px 24px rgba(0, 0, 0, .12);
}
.demo-usermenu__item {
  display: flex; align-items: center; gap: 10px; padding: 8px 10px;
  border-radius: 8px; cursor: pointer; transition: background .12s;
}
.demo-usermenu__item:hover { background: var(--jf-hover, #f5f7fa); }
.demo-usermenu__item.active { background: var(--jf-primary-soft, #e8f1ff); }
.demo-usermenu__meta { display: flex; flex-direction: column; line-height: 1.3; }
.demo-usermenu__name { font-size: 13px; color: var(--jf-text, #1f2937); }
.demo-usermenu__id { font-size: 11px; color: var(--jf-muted, #9ca3af); margin-left: 6px; }
.demo-usermenu__post { font-size: 11px; color: var(--jf-muted, #9ca3af); }
</style>
