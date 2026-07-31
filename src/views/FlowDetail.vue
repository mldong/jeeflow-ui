<template>
  <div>
    <div style="margin-bottom:16px">
      <button class="btn btn-ghost" @click="$router.push('/')">← 返回仪表盘</button>
    </div>

    <!-- Flow Viewer -->
    <div class="card" style="padding:0; overflow:hidden">
      <div style="height:420px">
        <FlowViewer :graphData="detail?.graphData" :highLight="detail?.highLight" />
      </div>
    </div>

    <!-- Instance Info -->
    <div class="card" v-if="detail">
      <h2>
        📄 流程详情
        <span style="font-size:13px;color:#888;font-weight:400;margin-left:8px">
          #{{ detail.id }} · {{ detail.defineName }}
        </span>
        <span :class="['badge', stateBadge(detail.state)]" style="margin-left:12px">{{ stateLabel(detail.state) }}</span>
      </h2>
      <div style="display:flex;gap:32px;font-size:13px;color:#666;margin-bottom:16px">
        <div>发起人: <strong>{{ detail.operator }}</strong></div>
        <div>流水号: <strong>{{ detail.businessNo || '-' }}</strong></div>
        <div>时间: <strong>{{ fmtTime(detail.createTime) }}</strong></div>
      </div>

      <!-- Approval Records -->
      <h3 style="font-size:14px;margin-bottom:8px">审批记录</h3>
      <table v-if="records.length">
        <thead><tr><th>节点</th><th>处理人</th><th>状态</th><th>时间</th></tr></thead>
        <tbody>
          <tr v-for="r in records" :key="r.id">
            <td><strong>{{ r.displayName }}</strong></td>
            <td>{{ r.operator || '-' }}</td>
            <td><span :class="['badge', taskStateBadge(r.taskState)]">{{ taskStateLabel(r.taskState) }}</span></td>
            <td style="font-size:12px;color:#888">{{ fmtTime(r.createTime) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else style="color:#aaa;text-align:center;padding:20px">暂无审批记录</div>
    </div>

    <div v-else-if="loading" style="text-align:center;padding:60px;color:#999">加载中...</div>
    <div v-else style="text-align:center;padding:60px;color:#999">实例不存在</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import FlowViewer from '../components/FlowViewer.vue'
import { fetchInstanceDetail } from '../api.js'

const route = useRoute()
const id = route.params.id

const detail = ref(null)
const loading = ref(true)

const records = ref([])

onMounted(async () => {
  try {
    const d = await fetchInstanceDetail(id)
    detail.value = d
    records.value = d?.approvalRecords || []
    if (d?.graphData) {
      // Ensure graphData has required structure for FlowDesigner
      detail.value = { ...d }
    }
  } catch (e) {
    console.error('Failed to load instance', e)
  } finally {
    loading.value = false
  }
})

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
