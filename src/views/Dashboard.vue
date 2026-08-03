<template>
  <div>
    <!-- Stats -->
    <div class="stats">
      <div class="stat"><div class="num">{{ stats.todoCount }}</div><div class="label">我的待办</div></div>
      <div class="stat"><div class="num">{{ stats.myInstanceCount }}</div><div class="label">我发起的流程</div></div>
      <div class="stat"><div class="num">{{ defines.length }}</div><div class="label">可用流程</div></div>
    </div>

    <!-- Quick Start -->
    <div class="card">
      <h2>🚀 发起流程</h2>
      <div class="form-row">
        <select v-model="startDefId" style="flex:1">
          <option :value="0">-- 选择流程定义 --</option>
          <option v-for="d in defines" :key="d.id" :value="d.id">{{ d.displayName }}</option>
        </select>
        <input v-model="startAmount" placeholder="金额（可选）" style="width:100px" type="number" />
        <button class="btn btn-ghost btn-sm" @click="doPreview" :disabled="!startDefId" title="预览流程图">👁 预览</button>
        <button class="btn btn-primary" @click="doStart">发起</button>
      </div>
    </div>

    <!-- TODO List -->
    <div class="card">
      <h2>
        📋 我的待办
        <span class="user-tabs">
          <button v-for="u in quickUsers" :key="u" :class="['user-tab', { active: currentUser === u }]" @click="switchUser(u)">{{ userLabels[u] || u }}</button>
        </span>
      </h2>
      <table v-if="todos.length">
        <thead><tr><th>流程</th><th>任务</th><th>表单</th><th>时间</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="t in todos" :key="t.id">
            <td>{{ t.defineName }}</td>
            <td><strong>{{ t.displayName }}</strong></td>
            <td style="color:#666;font-size:13px">{{ t.formKey || '-' }}</td>
            <td style="font-size:13px;color:#666">{{ fmtTime(t.createTime) }}</td>
            <td>
              <div style="display:flex;gap:6px">
                <button class="btn btn-primary btn-sm" @click="doApprove(t.id)">同意</button>
                <button class="btn btn-danger btn-sm" @click="doReject(t.id)">拒绝</button>
                <button class="btn btn-ghost btn-sm" @click="doRollback(t.id)">退回</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else style="color:#888;text-align:center;padding:20px">暂无待办</div>
    </div>

    <!-- My Instances -->
    <div class="card">
      <h2>📝 我发起的流程</h2>
      <table v-if="instances.length">
        <thead><tr><th>ID</th><th>流程</th><th>状态</th><th>时间</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="i in instances" :key="i.id">
            <td style="font-size:13px;color:#666">{{ i.id }}</td>
            <td>{{ i.defineName }}</td>
            <td><span :class="['badge', stateBadge(i.state)]">{{ stateLabel(i.state) }}</span></td>
            <td style="font-size:13px;color:#666">{{ fmtTime(i.createTime) }}</td>
            <td><button class="btn btn-ghost btn-sm" @click="openDetail(i.id)">详情 →</button></td>
          </tr>
        </tbody>
      </table>
      <div v-else style="color:#888;text-align:center;padding:20px">暂无记录</div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, onMounted } from 'vue'
import { fetchStats, fetchDefines, fetchTodoList, fetchInstances, startFlow, executeTask } from '../api.js'

const currentUser = inject('currentUser')
const toast = inject('toast')
const openDetail = inject('openDetail')
const openPreview = inject('openPreview')

const stats = ref({ todoCount: 0, myInstanceCount: 0 })
const defines = ref([])
const todos = ref([])
const instances = ref([])

const startDefId = ref(0)
const startAmount = ref('')

const quickUsers = ['user1', 'leader', 'manager', 'boss', 'director', 'userA', 'userB', 'userC']
const userLabels = { leader: '组长', manager: '经理', boss: '老板', director: '总监' }

async function loadAll() {
  try {
    const [s, d, t, i] = await Promise.all([
      fetchStats(currentUser.value),
      fetchDefines(),
      fetchTodoList(currentUser.value),
      fetchInstances(currentUser.value),
    ])
    stats.value = s
    defines.value = d
    todos.value = t
    instances.value = i
  } catch (e) {
    showToast('加载失败，后端是否启动？', 'error')
  }
}

async function doStart() {
  if (!startDefId.value) return showToast('请选择流程定义', 'error')
  try {
    await startFlow(startDefId.value, currentUser.value, startAmount.value || undefined)
    showToast('发起成功', 'success')
    startDefId.value = 0
    startAmount.value = ''
    await loadAll()
  } catch (e) { showToast('发起失败: ' + e.message, 'error') }
}

async function doPreview() {
  if (!startDefId.value) return
  const def = defines.value.find(d => d.id === startDefId.value)
  if (!def) return
  openPreview(def.id, def.displayName || def.name)
}

async function doApprove(taskId) {
  try {
    await executeTask(taskId, currentUser.value, 1)  // 1=AGREE
    showToast('处理成功', 'success')
    await loadAll()
  } catch (e) { showToast('失败: ' + e.message, 'error') }
}

async function doReject(taskId) {
  try {
    await executeTask(taskId, currentUser.value, 2)  // 2=REJECT → 流程结束（实例 45）
    showToast('已驳回', 'success')
    await loadAll()
  } catch (e) { showToast('失败: ' + e.message, 'error') }
}

async function doRollback(taskId) {
  try {
    await executeTask(taskId, currentUser.value, 6)  // 6=ROLLBACK_TO_OPERATOR → 退回发起人
    showToast('已退回发起人', 'success')
    await loadAll()
  } catch (e) { showToast('失败: ' + e.message, 'error') }
}

function switchUser(u) {
  currentUser.value = u
  localStorage.setItem('jeeflow_user', u)
  loadAll()
}

function stateBadge(s) {
  if (s === 10 || s === 'DOING') return 'badge-doing'
  if (s === 20 || s === 'DONE') return 'badge-done'
  if (s === 45 || s === 'REJECT') return 'badge-reject'
  return ''
}
function stateLabel(s) {
  if (s === 10 || s === 'DOING') return '进行中'
  if (s === 20 || s === 'DONE') return '已完成'
  if (s === 45 || s === 'REJECT') return '已拒绝'
  return s
}

function fmtTime(t) {
  if (!t) return ''
  const d = new Date(t)
  if (isNaN(d.getTime())) return t
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function showToast(msg, type) {
  toast.msg = msg
  toast.type = type
  setTimeout(() => toast.msg = '', 2500)
}

onMounted(loadAll)
</script>
