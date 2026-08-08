<template>
  <div class="jf-page">
    <h2 class="jf-page-title">
      <JfIcon name="define" :size="18" /> 流程定义
      <input
        v-model="keyword"
        class="jf-input jf-page-search"
        placeholder="搜索编码/显示名..."
        @keyup.enter="goSearch"
      />
    </h2>
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

    <!-- 定义详情：基本信息 + 流程图弹性铺满 -->
    <JfDrawer v-model:visible="detailVisible" :title="detail?.displayName || '流程详情'" width="820px">
      <div v-if="detail" class="jf-detail-body">
        <div class="jf-define-meta">
          <div class="jf-define-meta-item"><span class="jf-muted">编码</span><strong>{{ detail.name }}</strong></div>
          <div class="jf-define-meta-item"><span class="jf-muted">显示名</span><strong>{{ detail.displayName }}</strong></div>
          <div class="jf-define-meta-item"><span class="jf-muted">类型</span><span>{{ detail.type || '-' }}</span></div>
          <div class="jf-define-meta-item"><span class="jf-muted">版本</span><span>v{{ detail.version }}</span></div>
          <div class="jf-define-meta-item">
            <span class="jf-muted">状态</span>
            <JfBadge :type="detail.state === 1 ? 'done' : 'info'">{{ detail.state === 1 ? '启用' : '停用' }}</JfBadge>
          </div>
          <div class="jf-define-meta-item"><span class="jf-muted">创建</span><span>{{ fmtTime(detail.createTime, true) }}{{ detail.createUser ? `（${detail.createUser}）` : '' }}</span></div>
          <div class="jf-define-meta-item"><span class="jf-muted">更新</span><span>{{ fmtTime(detail.updateTime || detail.createTime, true) }}</span></div>
        </div>
        <div v-if="detail.jsonObject" class="jf-detail-graph">
          <JfFlowViewer :graph-data="detail.jsonObject" />
        </div>
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
import JfIcon from '../ui/JfIcon.vue'
import { useJeeflowUi } from '../provider'
import { fmtTime } from '../helpers'
import { toast } from '../toast'
import type { DefineRow, DefineDetail } from '../types'

defineOptions({ name: 'JfProcessDefinePage' })

const { api, can } = useJeeflowUi()

const loading = ref(false)
const rows = ref<DefineRow[]>([])
const pageNum = ref(1)
const pageSize = 10
const recordCount = ref(0)
const totalPage = ref(0)
const keyword = ref('')

const detailVisible = ref(false)
const detail = ref<DefineDetail | null>(null)

async function reload() {
  loading.value = true
  try {
    const r = await api.processDefine.page({
      pageNum: pageNum.value, pageSize, orderBy: 't.update_time desc',
      ...(keyword.value.trim() ? { m_LIKE_displayName: keyword.value.trim() } : {}),
    })
    rows.value = r.rows
    recordCount.value = r.recordCount
    totalPage.value = r.totalPage
  } catch (e) {
    toast.error(`加载失败：${(e as Error).message}`)
  } finally {
    loading.value = false
  }
}

function goSearch() {
  pageNum.value = 1
  reload()
}

function go(p: number) {
  pageNum.value = p
  reload()
}

async function openDetail(d: DefineRow) {
  try {
    detail.value = await api.processDefine.detail(d.id)
    detailVisible.value = true
  } catch (e) {
    toast.error(`打开详情失败：${(e as Error).message}`)
  }
}

async function toggle(d: DefineRow) {
  try {
    await api.processDefine.upAndDown(d.id, d.state === 1 ? 0 : 1)
    toast.success(d.state === 1 ? '已停用' : '已启用')
    reload()
  } catch (e) {
    toast.error(`操作失败：${(e as Error).message}`)
  }
}

async function remove(d: DefineRow) {
  if (!window.confirm(`确认删除流程定义「${d.displayName}」？`)) return
  try {
    await api.processDefine.remove(d.id)
    toast.success('已删除')
    reload()
  } catch (e) {
    toast.error(`删除失败：${(e as Error).message}`)
  }
}

onMounted(reload)
</script>

<style scoped>
.jf-page-search { width: 220px; margin-left: auto; font-weight: normal; }
.jf-define-meta {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px 20px; padding: 14px 16px;
  background: #fafbfc; border: 1px solid var(--jf-border, #f0f0f0); border-radius: 8px;
}
.jf-define-meta-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.jf-define-meta-item > .jf-muted { min-width: 42px; }
</style>
