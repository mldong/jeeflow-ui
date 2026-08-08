<template>
  <div class="jf-page">
    <h2 class="jf-page-title">
      <JfIcon name="todo" :size="18" /> 我的待办
      <input
        v-model="keyword"
        class="jf-input jf-page-search"
        placeholder="搜索流程名..."
        @keyup.enter="goSearch"
      />
    </h2>
    <div v-if="loading" class="jf-loading">加载中...</div>
    <template v-else>
      <table v-if="rows.length" class="jf-table">
        <thead>
          <tr><th>流程</th><th>任务</th><th>表单</th><th>时间</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="t in rows" :key="t.id" :class="{ 'jf-row-flash': highlight === t.id }">
            <td>{{ t.processDefineDisplayName || '-' }}</td>
            <td><strong>{{ t.displayName }}</strong></td>
            <td class="jf-muted">{{ t.formKey || '-' }}</td>
            <td class="jf-muted">{{ fmtTime(t.createTime, true) }}</td>
            <td>
              <div class="jf-btn-row">
                <button class="jf-btn jf-btn--primary jf-btn--sm" @click="openApprove(t.id)">办理</button>
                <button class="jf-btn jf-btn--ghost jf-btn--sm" @click="openDetail(t.processInstanceId)">详情</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="jf-empty">暂无待办</div>

      <!-- 分页 -->
      <div v-if="recordCount > pageSize" class="jf-pagination">
        <button class="jf-btn jf-btn--ghost jf-btn--sm" :disabled="pageNum <= 1" @click="go(pageNum - 1)">上一页</button>
        <span class="jf-muted">{{ pageNum }}/{{ totalPage }}（共 {{ recordCount }} 条）</span>
        <button class="jf-btn jf-btn--ghost jf-btn--sm" :disabled="pageNum >= totalPage" @click="go(pageNum + 1)">下一页</button>
      </div>
    </template>

    <!-- 办理抽屉 -->
    <ApproveDrawer v-model:visible="approveVisible" :task-id="approveTaskId" @changed="reload" />
    <!-- 详情抽屉 -->
    <InstanceDetailDrawer v-model:visible="detailVisible" :instance-id="detailInstanceId" @changed="reload" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import JfIcon from '../ui/JfIcon.vue'
import ApproveDrawer from '../drawers/ApproveDrawer.vue'
import InstanceDetailDrawer from '../drawers/InstanceDetailDrawer.vue'
import { useJeeflowUi } from '../provider'
import { fmtTime } from '../helpers'
import { toast } from '../toast'
import type { TaskRow } from '../types'

defineOptions({ name: 'JfTodoPage' })

const { api } = useJeeflowUi()

const loading = ref(false)
const rows = ref<TaskRow[]>([])
const pageNum = ref(1)
const pageSize = 10
const recordCount = ref(0)
const totalPage = ref(0)
const highlight = ref<string | null>(null)
const keyword = ref('')

const approveVisible = ref(false)
const approveTaskId = ref<string | null>(null)
const detailVisible = ref(false)
const detailInstanceId = ref<string | null>(null)

async function reload() {
  loading.value = true
  try {
    const r = await api.processTask.todoList({
      pageNum: pageNum.value, pageSize,
      ...(keyword.value.trim()
        ? { m_LIKE_processDefineDisplayName: keyword.value.trim() } : {}),
    })
    rows.value = r.rows
    recordCount.value = r.recordCount
    totalPage.value = r.totalPage
  } catch (e) {
    toast.error((e as Error).message || '加载待办列表失败')
  } finally {
    loading.value = false
  }
}

function go(p: number) {
  pageNum.value = p
  reload()
}

function goSearch() {
  pageNum.value = 1
  reload()
}

function openApprove(taskId: string) {
  approveTaskId.value = taskId
  approveVisible.value = true
}

function openDetail(instanceId: string) {
  detailInstanceId.value = instanceId
  detailVisible.value = true
}

onMounted(reload)
</script>

<style scoped>
.jf-page-search { width: 220px; margin-left: auto; font-weight: normal; }
</style>
