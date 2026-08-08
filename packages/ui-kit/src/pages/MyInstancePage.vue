<template>
  <div class="jf-page">
    <h2 class="jf-page-title">
      <JfIcon name="mine" :size="18" /> 我发起的流程
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
        <thead><tr><th>ID</th><th>流程</th><th>状态</th><th>时间</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="i in rows" :key="i.id">
            <td class="jf-muted">{{ i.id }}</td>
            <td>{{ i.displayName || i.processDefineDisplayName }}</td>
            <td><JfBadge :type="stateBadgeType(i.state)">{{ stateLabel(i.state) }}</JfBadge></td>
            <td class="jf-muted">{{ fmtTime(i.createTime, true) }}</td>
            <td>
              <div class="jf-btn-row">
                <button class="jf-btn jf-btn--ghost jf-btn--sm" @click="openDetail(i.id)">详情 →</button>
                <button v-if="can(['wf:processInstance:withdraw']) && i.state === 10" class="jf-btn jf-btn--ghost jf-btn--sm" @click="withdraw(i)">撤回</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="jf-empty">暂无记录</div>

      <div v-if="recordCount > pageSize" class="jf-pagination">
        <button class="jf-btn jf-btn--ghost jf-btn--sm" :disabled="pageNum <= 1" @click="go(pageNum - 1)">上一页</button>
        <span class="jf-muted">{{ pageNum }}/{{ totalPage }}（共 {{ recordCount }} 条）</span>
        <button class="jf-btn jf-btn--ghost jf-btn--sm" :disabled="pageNum >= totalPage" @click="go(pageNum + 1)">下一页</button>
      </div>
    </template>

    <InstanceDetailDrawer v-model:visible="detailVisible" :instance-id="detailInstanceId" @changed="reload" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import JfBadge from '../ui/JfBadge.vue'
import JfIcon from '../ui/JfIcon.vue'
import InstanceDetailDrawer from '../drawers/InstanceDetailDrawer.vue'
import { useJeeflowUi } from '../provider'
import { fmtTime, stateLabel, stateBadgeType } from '../helpers'
import { toast } from '../toast'
import type { InstanceRow } from '../types'

defineOptions({ name: 'JfMyInstancePage' })

const { api, can } = useJeeflowUi()

const loading = ref(false)
const rows = ref<InstanceRow[]>([])
const pageNum = ref(1)
const pageSize = 10
const recordCount = ref(0)
const totalPage = ref(0)
const keyword = ref('')

const detailVisible = ref(false)
const detailInstanceId = ref<string | null>(null)

async function reload() {
  loading.value = true
  try {
    const r = await api.processInstance.page({
      pageNum: pageNum.value, pageSize,
      ...(keyword.value.trim()
        ? { m_LIKE_processDefineDisplayName: keyword.value.trim() } : {}),
    })
    rows.value = r.rows
    recordCount.value = r.recordCount
    totalPage.value = r.totalPage
  } catch (e) {
    toast.error((e as Error).message || '加载实例列表失败')
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

function openDetail(id: string) {
  detailInstanceId.value = id
  detailVisible.value = true
}

async function withdraw(row: InstanceRow) {
  if (!window.confirm('确认撤回该流程？')) return
  try {
    await api.processInstance.withdraw(row.id)
    toast.success('已撤回')
    reload()
  } catch (e) {
    // 撤回可能因实例已办结/已被办理而失败（负向路径），提示后端原因
    toast.error(`撤回失败：${(e as Error).message}`)
  }
}

onMounted(reload)
</script>

<style scoped>
.jf-page-search { width: 220px; margin-left: auto; font-weight: normal; }
</style>
