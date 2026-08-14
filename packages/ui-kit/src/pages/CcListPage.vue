<template>
  <div class="jf-page">
    <h2 class="jf-page-title">
      <JfIcon name="cc" :size="18" /> 我的抄送
      <!-- 关键字搜索（m_LIKE 匹配流程名） -->
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
        <thead><tr><th>流程</th><th>实例状态</th><th>阅读状态</th><th>发起人</th><th>时间</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="i in rows" :key="i.id">
            <td>{{ i.displayName || i.processDefineDisplayName }}</td>
            <td><JfBadge :type="stateBadgeType(i.state)">{{ stateLabel(i.state) }}</JfBadge></td>
            <td>
              <JfBadge :type="readIds.has(i.id) ? 'done' : 'doing'">
                {{ readIds.has(i.id) ? '已读' : '未读' }}
              </JfBadge>
            </td>
            <td>{{ i.operator || '-' }}</td>
            <td class="jf-muted">{{ fmtTime(i.createTime, true) }}</td>
            <td>
              <div class="jf-btn-row">
                <button class="jf-btn jf-btn--ghost jf-btn--sm" @click="openDetail(i.id)">详情</button>
                <button
                  v-if="can(['wf:processInstance:createCCInstance'])"
                  class="jf-btn jf-btn--ghost jf-btn--sm"
                  @click="openCc(i.id)"
                >抄送他人</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="jf-empty">暂无抄送</div>

      <div v-if="recordCount > pageSize" class="jf-pagination">
        <button class="jf-btn jf-btn--ghost jf-btn--sm" :disabled="pageNum <= 1" @click="go(pageNum - 1)">上一页</button>
        <span class="jf-muted">{{ pageNum }}/{{ totalPage }}（共 {{ recordCount }} 条）</span>
        <button class="jf-btn jf-btn--ghost jf-btn--sm" :disabled="pageNum >= totalPage" @click="go(pageNum + 1)">下一页</button>
      </div>
    </template>

    <InstanceDetailDrawer v-model:visible="detailVisible" :instance-id="detailInstanceId" @changed="reload" />

    <!-- 手动抄送（行级：针对具体实例） -->
    <JfDrawer v-model:visible="ccVisible" title="手动抄送" width="480px">
      <div class="jf-form-item">
        <label class="jf-form-label">抄送人</label>
        <JfUserPicker v-model="ccIds" scene="cc" placeholder="搜索姓名/工号" />
      </div>
      <div class="jf-drawer-actions">
        <button class="jf-btn jf-btn--ghost" @click="ccVisible = false">取消</button>
        <button class="jf-btn jf-btn--primary" :disabled="ccSaving || !ccIds.length" @click="doCc">确定</button>
      </div>
    </JfDrawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import JfBadge from '../ui/JfBadge.vue'
import JfDrawer from '../ui/JfDrawer.vue'
import JfUserPicker from '../ui/JfUserPicker.vue'
import JfIcon from '../ui/JfIcon.vue'
import InstanceDetailDrawer from '../drawers/InstanceDetailDrawer.vue'
import { useJeeflowUi } from '../provider'
import { fmtTime, stateLabel, stateBadgeType } from '../helpers'
import { toast } from '../toast'
import type { InstanceRow } from '../types'

defineOptions({ name: 'JfCcListPage' })

const { api, can } = useJeeflowUi()

const loading = ref(false)
const rows = ref<InstanceRow[]>([])
const pageNum = ref(1)
const pageSize = 10
const recordCount = ref(0)
const totalPage = ref(0)
const keyword = ref('')
/** 已读实例集合（ccList 出口不带 cc.state：打开详情标已读后本地维护） */
const readIds = reactive(new Set<string>())

const detailVisible = ref(false)
const detailInstanceId = ref<string | null>(null)

const ccVisible = ref(false)
const ccTargetId = ref<string | null>(null)
const ccIds = ref<string[]>([])
const ccSaving = ref(false)

async function reload() {
  loading.value = true
  try {
    const r = await api.processInstance.ccList({
      pageNum: pageNum.value, pageSize,
      ...(keyword.value.trim()
        ? { m_LIKE_processDefineDisplayName: keyword.value.trim() } : {}),
    })
    rows.value = r.rows
    recordCount.value = r.recordCount
    totalPage.value = r.totalPage
  } catch (e) {
    toast.error((e as Error).message || '加载抄送列表失败')
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

/** 打开详情：先 updateCCStatus 标已读（后端落库）再展示 */
async function openDetail(id: string) {
  try {
    await api.processInstance.updateCCStatus(id)
    readIds.add(id)
  } catch { /* 标已读失败不阻塞查看 */ }
  detailInstanceId.value = id
  detailVisible.value = true
}

function openCc(instanceId: string) {
  ccTargetId.value = instanceId
  ccIds.value = []
  ccVisible.value = true
}

async function doCc() {
  if (!ccTargetId.value || !ccIds.value.length) return
  ccSaving.value = true
  try {
    await api.processInstance.createCCInstance(ccTargetId.value, ccIds.value)
    toast.success('抄送成功')
    ccVisible.value = false
    ccIds.value = []
  } catch (e) {
    toast.error((e as Error).message || '抄送失败')
  } finally {
    ccSaving.value = false
  }
}

onMounted(reload)
</script>

<style scoped>
.jf-page-search { width: 220px; margin-left: auto; font-weight: normal; }
</style>
