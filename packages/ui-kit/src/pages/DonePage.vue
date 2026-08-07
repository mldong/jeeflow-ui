<template>
  <div class="jf-page">
    <h2 class="jf-page-title">📗 我的已办</h2>
    <div v-if="loading" class="jf-loading">加载中...</div>
    <template v-else>
      <table v-if="rows.length" class="jf-table">
        <thead><tr><th>流程</th><th>任务</th><th>状态</th><th>完成时间</th></tr></thead>
        <tbody>
          <tr v-for="t in rows" :key="t.id">
            <td>{{ t.processDefineDisplayName || t.defineName }}</td>
            <td><strong>{{ t.displayName }}</strong></td>
            <td><JfBadge :type="taskStateBadgeType(t.taskState)">{{ taskStateLabel(t.taskState) }}</JfBadge></td>
            <td class="jf-muted">{{ fmtTime(t.finishTime || t.createTime, true) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="jf-empty">暂无已办</div>

      <div v-if="recordCount > pageSize" class="jf-pagination">
        <button class="jf-btn jf-btn--ghost jf-btn--sm" :disabled="pageNum <= 1" @click="go(pageNum - 1)">上一页</button>
        <span class="jf-muted">{{ pageNum }}/{{ totalPage }}（共 {{ recordCount }} 条）</span>
        <button class="jf-btn jf-btn--ghost jf-btn--sm" :disabled="pageNum >= totalPage" @click="go(pageNum + 1)">下一页</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import JfBadge from '../ui/JfBadge.vue'
import { useJeeflowUi } from '../provider'
import { fmtTime, taskStateLabel, taskStateBadgeType } from '../helpers'
import type { TaskRow } from '../types'

defineOptions({ name: 'JfDonePage' })

const { api } = useJeeflowUi()

const loading = ref(false)
const rows = ref<TaskRow[]>([])
const pageNum = ref(1)
const pageSize = 10
const recordCount = ref(0)
const totalPage = ref(0)

async function reload() {
  loading.value = true
  try {
    const r = await api.processTask.doneList({ pageNum: pageNum.value, pageSize })
    rows.value = r.rows
    recordCount.value = r.recordCount
    totalPage.value = r.totalPage
  } finally {
    loading.value = false
  }
}

function go(p: number) {
  pageNum.value = p
  reload()
}

onMounted(reload)
</script>
