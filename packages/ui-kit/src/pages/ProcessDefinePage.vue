<template>
  <div class="jf-page">
    <h2 class="jf-page-title">📦 流程定义</h2>
    <div v-if="loading" class="jf-loading">加载中...</div>
    <template v-else>
      <table v-if="rows.length" class="jf-table">
        <thead><tr><th>编码</th><th>显示名</th><th>类型</th><th>版本</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="d in rows" :key="d.id">
            <td class="jf-muted">{{ d.name }}</td>
            <td><strong>{{ d.displayName }}</strong></td>
            <td class="jf-muted">{{ d.type }}</td>
            <td class="jf-muted">v{{ d.version }}</td>
            <td><JfBadge :type="d.state === 1 ? 'done' : 'info'">{{ d.state === 1 ? '启用' : '停用' }}</JfBadge></td>
            <td class="jf-muted">{{ fmtTime(d.updateTime || d.createTime, true) }}</td>
            <td>
              <div class="jf-btn-row">
                <button class="jf-btn jf-btn--ghost jf-btn--sm" @click="openDetail(d)">详情</button>
                <button
                  v-if="can(['wf:processDefine:upAndDown'])"
                  class="jf-btn jf-btn--ghost jf-btn--sm"
                  @click="toggle(d)"
                >{{ d.state === 1 ? '停用' : '启用' }}</button>
                <button
                  v-if="can(['wf:processDefine:remove'])"
                  class="jf-btn jf-btn--danger jf-btn--sm"
                  @click="remove(d)"
                >删除</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="jf-empty">暂无流程定义（先在设计页发布）</div>

      <div v-if="recordCount > pageSize" class="jf-pagination">
        <button class="jf-btn jf-btn--ghost jf-btn--sm" :disabled="pageNum <= 1" @click="go(pageNum - 1)">上一页</button>
        <span class="jf-muted">{{ pageNum }}/{{ totalPage }}（共 {{ recordCount }} 条）</span>
        <button class="jf-btn jf-btn--ghost jf-btn--sm" :disabled="pageNum >= totalPage" @click="go(pageNum + 1)">下一页</button>
      </div>
    </template>

    <!-- 定义详情：流程图 + 基本信息 -->
    <JfDrawer v-model:visible="detailVisible" :title="detail?.displayName || '流程详情'" width="820px">
      <div v-if="detail">
        <JfFlowViewer v-if="detail.jsonObject" :graph-data="detail.jsonObject" height="420px" />
        <div v-else class="jf-empty">该定义无流程图（content 缺失）</div>
      </div>
    </JfDrawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import JfBadge from '../ui/JfBadge.vue'
import JfDrawer from '../ui/JfDrawer.vue'
import JfFlowViewer from '../ui/JfFlowViewer.vue'
import { useJeeflowUi } from '../provider'
import { fmtTime } from '../helpers'
import type { DefineRow, DefineDetail } from '../types'

defineOptions({ name: 'JfProcessDefinePage' })

const { api, can } = useJeeflowUi()

const loading = ref(false)
const rows = ref<DefineRow[]>([])
const pageNum = ref(1)
const pageSize = 10
const recordCount = ref(0)
const totalPage = ref(0)

const detailVisible = ref(false)
const detail = ref<DefineDetail | null>(null)

async function reload() {
  loading.value = true
  try {
    const r = await api.processDefine.page({ pageNum: pageNum.value, pageSize, orderBy: 't.update_time desc' })
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

async function openDetail(d: DefineRow) {
  detail.value = await api.processDefine.detail(d.id)
  detailVisible.value = true
}

async function toggle(d: DefineRow) {
  await api.processDefine.upAndDown(d.id, d.state === 1 ? 0 : 1)
  reload()
}

async function remove(d: DefineRow) {
  if (!window.confirm(`确认删除流程定义「${d.displayName}」？`)) return
  await api.processDefine.remove(d.id)
  reload()
}

onMounted(reload)
</script>
