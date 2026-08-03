<template>
  <div id="jeeflow-app">
    <header class="app-header">
      <div class="brand">
        <h1 @click="goHome" style="cursor:pointer">🧊 jeeflow</h1>
        <span class="brand-slogan">轻量工作流引擎 · 多语言联邦</span>
      </div>
      <div class="header-right">
        <!-- 自定义下拉（原生 select 在 IAB 里弹不出菜单） -->
        <div class="backend-select-wrap">
          <button class="backend-select" @click.stop="backendOpen = !backendOpen">
            {{ currentBackendLabel }}
            <span class="caret">▾</span>
          </button>
          <div v-if="backendOpen" class="backend-dropdown" @click.stop>
            <div
              v-for="b in backends"
              :key="b.value"
              class="backend-option"
              :class="{ active: backend === b.value }"
              @click="switchBackend(b.value)"
            >
              {{ b.label }}
            </div>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn btn-ghost btn-sm" style="color:#ddd;border-color:#555" @click="openLibrary" title="查看全部流程定义的流程图">📐 流程库</button>
          <button class="btn btn-ghost btn-sm" style="color:#ddd;border-color:#555" @click="resetData" title="一键清空演示数据（调用 demo /api/reset）">🧹 重置数据</button>
          <button class="btn btn-demo btn-sm" :class="{ active: demoMode }" @click="demoMode = !demoMode" title="演示模式：步骤提示 + 全局字号放大，专供录屏">🎬 演示模式</button>
          <span class="user-badge">👤 {{ currentUser }}</span>
        </div>
      </div>
    </header>
    <div v-if="demoMode && demoStep" class="demo-step">{{ demoStep }}</div>
    <main>
      <Dashboard />
    </main>

    <!-- 流程详情抽屉 -->
    <DingDrawer :visible="detailVisible" :title="detailTitle" width="900px" @update:visible="detailVisible = $event" @close="detailVisible = false">
      <div v-if="detailLoading" class="loading-text">加载中...</div>
      <template v-else-if="detailData">
        <!-- 流程图 -->
        <!-- issues/13：钉钉模式纵向布局，详情流程图容器加高到与预览一致（380→520px），避免底部节点截断 -->
        <div v-if="detailData.graphData" style="height:520px;margin-bottom:18px;border:1px solid #f0f0f0;border-radius:8px;overflow:hidden">
          <FlowViewer :graphData="detailData.graphData" :highLight="detailHighLight" />
        </div>
        <!-- 基本信息 -->
        <div style="display:flex;gap:24px;font-size:14px;color:#555;margin-bottom:16px">
          <div>发起人: <strong style="color:#333">{{ detailData.operator }}</strong></div>
          <div>流水号: <strong style="color:#333">{{ detailData.businessNo || '-' }}</strong></div>
          <div>时间: <strong style="color:#333">{{ fmtTime(detailData.createTime) }}</strong></div>
        </div>
        <!-- 审批记录 -->
        <h3 style="font-size:14px;margin-bottom:8px">审批记录</h3>
        <table v-if="detailRecords.length" class="mini-table">
          <thead><tr><th>节点</th><th>处理人</th><th>状态</th><th>时间</th></tr></thead>
          <tbody>
            <tr v-for="r in detailRecords" :key="r.id">
              <td><strong>{{ r.displayName }}</strong></td>
              <td>{{ r.operator || '-' }}</td>
              <td><span :class="['badge', taskStateBadge(r.taskState)]">{{ taskStateLabel(r.taskState) }}</span></td>
              <td style="font-size:13px;color:#666">{{ fmtTime(r.createTime) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else style="color:#888;text-align:center;padding:16px">暂无审批记录</div>
      </template>
      <div v-else class="loading-text">实例不存在</div>
    </DingDrawer>

    <!-- 流程图预览抽屉 -->
    <DingDrawer :visible="previewVisible" :title="previewTitle" width="800px" @update:visible="previewVisible = $event" @close="previewVisible = false">
      <div v-if="previewGraphData" style="height:520px">
        <FlowViewer :graphData="previewGraphData" />
      </div>
      <div v-else class="loading-text">暂无可预览的流程图</div>
    </DingDrawer>

    <!-- 流程库抽屉（issues/12）：全部流程定义 + 流程图只读展示 -->
    <DingDrawer :visible="libraryVisible" title="📐 流程库" width="1080px" @update:visible="libraryVisible = $event" @close="libraryVisible = false">
      <div v-if="libraryDefines.length" style="display:flex;gap:16px;height:100%">
        <div style="width:280px;flex-shrink:0;border-right:1px solid #f0f0f0;overflow:auto;padding-right:8px">
          <div
            v-for="d in libraryDefines"
            :key="d.id"
            class="lib-item"
            :class="{ active: libraryActive === d.id }"
            @click="selectLibrary(d)"
          >
            <div class="lib-name">{{ d.displayName }}</div>
            <div class="lib-meta">{{ d.name }} · 表单：{{ formLabel(d.formKey) }}</div>
          </div>
        </div>
        <div style="flex:1;min-width:0">
          <div v-if="libraryGraphData" style="height:560px;border:1px solid #f0f0f0;border-radius:8px;overflow:hidden">
            <FlowViewer :graphData="libraryGraphData" />
          </div>
          <div v-else class="loading-text">暂无可预览的流程图</div>
        </div>
      </div>
      <div v-else class="loading-text">加载中...</div>
    </DingDrawer>

    <div v-if="toast.msg" :class="['toast', toast.type, 'show', { big: toast.big }]">
      <span class="toast-icon">{{ toast.icon }}</span>{{ toast.msg }}
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, provide, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import Dashboard from './views/Dashboard.vue'
import DingDrawer from './components/DingDrawer.vue'
import FlowViewer from './components/FlowViewer.vue'
import { fetchInstanceDetail, fetchApprovalRecord, fetchHighLight, fetchDefineDetail, fetchReset } from './api.js'

const backends = [
  { label: '🐍 Python :8100', value: 'http://localhost:8100' },
  { label: '☕ Java :8080', value: 'http://localhost:8080' },
  { label: '🔷 Go :8081', value: 'http://localhost:8081' },
  { label: '🟢 Node :8082', value: 'http://localhost:8082' },
]

const backend = ref(localStorage.getItem('jeeflow_backend') || 'http://localhost:8100')
provide('backend', backend)

const backendOpen = ref(false)
const currentBackendLabel = computed(() =>
  (backends.find(b => b.value === backend.value) || backends[0]).label
)

// 点击空白处关闭下拉
onMounted(() => document.addEventListener('click', () => backendOpen.value = false))
onBeforeUnmount(() => document.removeEventListener('click', () => backendOpen.value = false))

function switchBackend(url) {
  backend.value = url
  backendOpen.value = false
  localStorage.setItem('jeeflow_backend', url)
  location.reload()
}

const currentUser = ref(localStorage.getItem('jeeflow_user') || 'user1')
provide('currentUser', currentUser)

const toast = reactive({ msg: '', type: 'success', big: false, icon: '' })
let toastTimer = null
function showToast(msg, type = 'success', big = false) {
  toast.msg = msg
  toast.type = type
  toast.big = big
  toast.icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toast.msg = '', 3500)
}
provide('toast', toast)
provide('showToast', showToast)

// 演示模式（issues/11）：步骤提示条 + body.demo-mode 全局字号放大
const demoMode = ref(false)
const demoStep = ref('')
provide('demoMode', demoMode)
provide('demoStep', demoStep)
watch(demoMode, v => {
  document.body.classList.toggle('demo-mode', v)
  if (!v) demoStep.value = ''
})

async function resetData() {
  if (!window.confirm('确认重置演示数据？（清空实例/任务，重载种子流程）')) return
  try {
    await fetchReset()
    showToast('数据已重置，回到种子状态', 'success', true)
    setTimeout(() => location.reload(), 800)
  } catch (e) {
    showToast('重置失败（当前后端未提供 /api/reset）: ' + e.message, 'error')
  }
}

function goHome() {
  detailVisible.value = false
  previewVisible.value = false
}

// ── Detail Drawer ──────────────────────────────────────────────────────────

const detailVisible = ref(false)
const detailTitle = ref('')
const detailLoading = ref(false)
const detailData = ref(null)
const detailRecords = ref([])
const detailHighLight = ref(null)

async function openDetail(id) {
  detailVisible.value = true
  detailTitle.value = '流程详情 #' + id
  detailLoading.value = true
  detailData.value = null
  detailRecords.value = []
  detailHighLight.value = null
  try {
    // boot2 独立端点：详情 + 审批记录 + 高亮
    const [d, records, hl] = await Promise.all([
      fetchInstanceDetail(id),
      fetchApprovalRecord(id),
      fetchHighLight(id),
    ])
    detailData.value = d
    detailRecords.value = records
    detailHighLight.value = hl
    if (d?.displayName) {
      detailTitle.value = d.displayName + ' · ' + stateLabel(d.state)
    }
  } catch (e) {
    console.error(e)
  } finally {
    detailLoading.value = false
  }
}

// ── Preview Drawer ──────────────────────────────────────────────────────────

const previewVisible = ref(false)
const previewTitle = ref('')
const previewGraphData = ref(null)

async function openPreview(defineId, displayName) {
  previewVisible.value = true
  previewTitle.value = '预览：' + displayName
  previewGraphData.value = null
  try {
    const d = await fetchDefineDetail(defineId)
    if (d?.graphData) {
      previewGraphData.value = d.graphData
    }
  } catch (e) {
    console.error(e)
  }
}

// Need to be able to get graph data for a flow definition. Let me adjust the approach:
// Pass the graphData from the Dashboard (where it's already loaded from fetchDefines)
// Actually, fetchDefines doesn't return content. We need another approach.
// The simplest: load from the shared JSON files via a direct API call

provide('openDetail', openDetail)
provide('openPreview', openPreview)

// ── 流程库（issues/12）───────────────────────────────────────────────────────

const libraryVisible = ref(false)
const libraryDefines = ref([])
const libraryActive = ref(0)
const libraryGraphData = ref(null)
const libraryFormKeys = ref({})

async function openLibrary() {
  libraryVisible.value = true
  if (libraryDefines.value.length) return
  try {
    const r = await fetch('/wf/processDefine/page', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pageNum: 1, pageSize: 50 }) })
    const data = (await r.json())?.data?.rows || []
    const defs = []
    for (const d of data) {
      const detail = await fetchDefineDetail(d.id)
      defs.push({
        id: d.id, name: d.name, displayName: d.displayName || d.name,
        jsonObject: detail?.jsonObject || null,
        formKey: firstFormKey(detail?.jsonObject),
      })
    }
    libraryDefines.value = defs
    if (defs.length) selectLibrary(defs[0])
  } catch (e) {
    console.error(e)
  }
}

function selectLibrary(d) {
  libraryActive.value = d.id
  libraryGraphData.value = d.jsonObject
}

// 首个任务节点的 form（apply-form/expense-form）
function firstFormKey(graph) {
  for (const n of graph?.nodes || []) {
    if (n?.type === 'snaker:task' && n?.properties?.form) return n.properties.form
  }
  return ''
}
function formLabel(f) {
  return f || '无'
}

const formSchemas = {
  'apply-form': [
    { key: 'reason', label: '事由', type: 'text', required: true },
    { key: 'amount', label: '申请金额', type: 'number' },
  ],
  'expense-form': [
    { key: 'reason', label: '报销事由', type: 'text', required: true },
    { key: 'amount', label: '报销金额', type: 'number', required: true },
    { key: 'category', label: '费用类别', type: 'select', options: ['差旅', '办公', '招待', '其他'] },
  ],
}
provide('formSchemas', formSchemas)

// ── Helpers ──────────────────────────────────────────────────────────────────

function stateLabel(s) {
  if (s === 10 || s === 'DOING') return '进行中'
  if (s === 20 || s === 'DONE') return '已完成'
  if (s === 45 || s === 'REJECT') return '已拒绝'
  return s
}
function taskStateBadge(s) {
  if (s === 10) return 'badge-doing'
  if (s === 20) return 'badge-done'
  if (s === 99) return 'badge-reject'
  return ''
}
function taskStateLabel(s) {
  if (s === 10) return '进行中'
  if (s === 20) return '已完成'
  if (s === 99) return '已废弃'
  return s
}
function fmtTime(t) {
  if (!t) return ''
  const d = new Date(t)
  if (isNaN(d.getTime())) return t
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
</script>

<style>
@import './style.css';

.app-header {
  background: #1a1a2e;
  color: #fff;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.app-header h1 { font-size: 18px; font-weight: 600; margin: 0; }
.brand { display: flex; align-items: baseline; gap: 12px; }
.brand-slogan { font-size: 13px; color: #9aa5c0; letter-spacing: .5px; }
.lib-item { padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: all .15s; margin-bottom: 4px; }
.lib-item:hover { background: #f5f7fa; }
.lib-item.active { background: #e6f4ff; }
.lib-item.active .lib-name { color: #1677ff; }
.lib-name { font-size: 14px; font-weight: 600; color: #333; }
.lib-meta { font-size: 12px; color: #888; margin-top: 2px; }
.header-right { display: flex; align-items: center; gap: 16px; }
.backend-select-wrap { position: relative; }
.backend-select {
  padding: 6px 12px; border-radius: 6px; border: 1px solid #555;
  background: #16213e; color: #eee; font-size: 13px; cursor: pointer;
  display: flex; align-items: center; gap: 6px; min-width: 140px; justify-content: space-between;
}
.backend-select:hover { border-color: #1677ff; color: #fff; }
.caret { font-size: 10px; opacity: .7; }
.backend-dropdown {
  position: absolute; top: calc(100% + 4px); right: 0; min-width: 100%;
  background: #1a1a2e; border: 1px solid #333; border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,.4); z-index: 1000; overflow: hidden;
}
.backend-option {
  padding: 8px 14px; font-size: 13px; color: #ccc; cursor: pointer;
  white-space: nowrap; transition: all .15s;
}
.backend-option:hover { background: #16213e; color: #fff; }
.backend-option.active { background: #1677ff; color: #fff; }
.user-badge { font-size: 14px; color: #ccc; }

.mini-table { width: 100%; border-collapse: collapse; }
.mini-table th, .mini-table td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e8e8e8; font-size: 14px; }
.mini-table th { background: #fafafa; font-weight: 600; color: #444; }

.loading-text { text-align: center; padding: 40px; color: #888; }
</style>
