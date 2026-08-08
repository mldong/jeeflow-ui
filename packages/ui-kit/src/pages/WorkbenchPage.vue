<template>
  <div class="jf-page jf-workbench">
    <h2 class="jf-page-title"><JfIcon name="home" :size="18" /> 工作台</h2>

    <!-- 统计卡片（四端门面口径：分页 recordCount，无额外端点依赖） -->
    <div class="wb-cards">
      <div v-for="c in cards" :key="c.key" class="wb-card" @click="emit('goto', c.key)">
        <div class="wb-card__num">{{ c.count == null ? '-' : c.count }}</div>
        <div class="wb-card__label">{{ c.label }}</div>
      </div>
    </div>

    <!-- 最近待办 -->
    <h3 class="jf-section-title">
      最近待办
      <button v-if="todoTotal > recentRows.length" class="jf-btn jf-btn--ghost jf-btn--sm" @click="emit('goto', 'todo')">
        查看全部 {{ todoTotal }} 条 →
      </button>
    </h3>
    <div v-if="loading" class="jf-loading">加载中...</div>
    <template v-else>
      <table v-if="recentRows.length" class="jf-table">
        <thead>
          <tr><th>流程</th><th>任务</th><th>时间</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="t in recentRows" :key="t.id">
            <td>{{ t.processDefineDisplayName || '-' }}</td>
            <td><strong>{{ t.displayName }}</strong></td>
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
      <div v-else class="jf-empty">暂无待办，喝口茶吧 <JfIcon name="coffee" :size="14" /></div>
    </template>

    <!-- 办理/详情抽屉 -->
    <ApproveDrawer v-model:visible="approveVisible" :task-id="approveTaskId" @changed="reload" />
    <InstanceDetailDrawer v-model:visible="detailVisible" :instance-id="detailInstanceId" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import JfIcon from '../ui/JfIcon.vue'
import ApproveDrawer from '../drawers/ApproveDrawer.vue'
import InstanceDetailDrawer from '../drawers/InstanceDetailDrawer.vue'
import { useJeeflowUi } from '../provider'
import { fmtTime } from '../helpers'
import type { TaskRow } from '../types'

defineOptions({ name: 'JfWorkbenchPage' })

const emit = defineEmits<{
  /** 卡片点击 → 宿主切换菜单（todo/done/mine/cc） */
  goto: [key: string]
}>()

const { api } = useJeeflowUi()

const loading = ref(false)
const recentRows = ref<TaskRow[]>([])
const todoTotal = ref(0)

const cards = reactive([
  { key: 'todo', label: '待办', count: null as number | null },
  { key: 'done', label: '在办（已处理）', count: null as number | null },
  { key: 'mine', label: '我发起的', count: null as number | null },
  { key: 'cc', label: '抄送我的', count: null as number | null },
])

const approveVisible = ref(false)
const approveTaskId = ref<string | null>(null)
const detailVisible = ref(false)
const detailInstanceId = ref<string | null>(null)

async function reload() {
  loading.value = true
  try {
    // 四路并行 + 单路失败不拖垮整体（allSettled）
    const [todo, done, mine, cc] = await Promise.allSettled([
      api.processTask.todoList({ pageNum: 1, pageSize: 5 }),
      api.processTask.doneList({ pageNum: 1, pageSize: 1 }),
      api.processInstance.page({ pageNum: 1, pageSize: 1 }),
      api.processInstance.ccList({ pageNum: 1, pageSize: 1 }),
    ])
    if (todo.status === 'fulfilled') {
      recentRows.value = todo.value.rows
      todoTotal.value = todo.value.recordCount
      cards[0].count = todo.value.recordCount
    }
    if (done.status === 'fulfilled') cards[1].count = done.value.recordCount
    if (mine.status === 'fulfilled') cards[2].count = mine.value.recordCount
    if (cc.status === 'fulfilled') cards[3].count = cc.value.recordCount
  } finally {
    loading.value = false
  }
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
.wb-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; margin-bottom: 8px; }
.wb-card {
  background: var(--jf-bg, #fff); border: 1px solid var(--jf-border, #f0f0f0);
  border-radius: 10px; padding: 16px; cursor: pointer; transition: all .15s;
}
.wb-card:hover { box-shadow: 0 4px 14px rgba(0, 0, 0, .08); border-color: var(--jf-primary, #1677ff); }
.wb-card__num { font-size: 26px; font-weight: 700; color: var(--jf-primary, #1677ff); }
.wb-card__label { font-size: 13px; color: #666; margin-top: 4px; }
.jf-section-title { display: flex; align-items: center; gap: 12px; }
</style>
