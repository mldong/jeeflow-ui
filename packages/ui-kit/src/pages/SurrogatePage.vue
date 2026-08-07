<template>
  <div class="jf-page">
    <h2 class="jf-page-title">
      我的委托
      <button v-if="can(['wf:processSurrogate:save'])" class="jf-btn jf-btn--primary jf-btn--sm" @click="openForm()">＋ 新增委托</button>
    </h2>
    <div v-if="loading" class="jf-loading">加载中...</div>
    <div v-else-if="errorMsg" class="jf-empty">{{ errorMsg }}</div>
    <template v-else>
      <table v-if="rows.length" class="jf-table">
        <thead><tr><th>流程</th><th>被委托人</th><th>生效时间</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="s in rows" :key="s.id">
            <td>{{ s.processName || '全部流程' }}</td>
            <td><strong>{{ s.surrogate }}</strong></td>
            <td class="jf-muted">{{ fmtTime(s.startTime, true) }} ~ {{ fmtTime(s.endTime, true) }}</td>
            <td><JfBadge :type="s.enabled === 1 ? 'done' : 'info'">{{ s.enabled === 1 ? '启用' : '停用' }}</JfBadge></td>
            <td>
              <div class="jf-btn-row">
                <button class="jf-btn jf-btn--ghost jf-btn--sm" @click="openForm(s)">编辑</button>
                <button class="jf-btn jf-btn--danger jf-btn--sm" @click="remove(s)">删除</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="jf-empty">暂无委托</div>

      <div v-if="recordCount > pageSize" class="jf-pagination">
        <button class="jf-btn jf-btn--ghost jf-btn--sm" :disabled="pageNum <= 1" @click="go(pageNum - 1)">上一页</button>
        <span class="jf-muted">{{ pageNum }}/{{ totalPage }}（共 {{ recordCount }} 条）</span>
        <button class="jf-btn jf-btn--ghost jf-btn--sm" :disabled="pageNum >= totalPage" @click="go(pageNum + 1)">下一页</button>
      </div>
    </template>

    <!-- 新增/编辑委托 -->
    <JfDrawer v-model:visible="formVisible" :title="formId ? '编辑委托' : '新增委托'" width="520px">
      <div class="jf-form-item">
        <label class="jf-form-label">流程编码（留空 = 全部流程）</label>
        <input v-model="form.processName" class="jf-input" placeholder="leave" />
      </div>
      <div class="jf-form-item">
        <label class="jf-form-label">被委托人 userId *</label>
        <input v-model="form.surrogate" class="jf-input" placeholder="userA" />
      </div>
      <div class="jf-form-row">
        <div class="jf-form-item">
          <label class="jf-form-label">生效时间 *</label>
          <input v-model="form.startTime" class="jf-input" type="datetime-local" />
        </div>
        <div class="jf-form-item">
          <label class="jf-form-label">失效时间 *</label>
          <input v-model="form.endTime" class="jf-input" type="datetime-local" />
        </div>
      </div>
      <div class="jf-form-item">
        <label class="jf-form-label">状态</label>
        <select v-model="form.enabled" class="jf-input">
          <option :value="1">启用</option>
          <option :value="0">停用</option>
        </select>
      </div>
      <div class="jf-drawer-actions">
        <button class="jf-btn jf-btn--ghost" @click="formVisible = false">取消</button>
        <button class="jf-btn jf-btn--primary" :disabled="saving" @click="save">保存</button>
      </div>
    </JfDrawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import JfBadge from '../ui/JfBadge.vue'
import JfDrawer from '../ui/JfDrawer.vue'
import { useJeeflowUi } from '../provider'
import { fmtTime } from '../helpers'
import type { SurrogateRow } from '../types'

defineOptions({ name: 'JfSurrogatePage' })

const { api, can } = useJeeflowUi()

const loading = ref(false)
const errorMsg = ref('')
const rows = ref<SurrogateRow[]>([])
const pageNum = ref(1)
const pageSize = 10
const recordCount = ref(0)
const totalPage = ref(0)

const formVisible = ref(false)
const formId = ref<string | null>(null)
const form = ref<Record<string, any>>({})
const saving = ref(false)

async function reload() {
  loading.value = true
  errorMsg.value = ''
  try {
    const r = await api.processSurrogate.page({ pageNum: pageNum.value, pageSize })
    rows.value = r.rows
    recordCount.value = r.recordCount
    totalPage.value = r.totalPage
  } catch (e) {
    // 后端未注册扩展仓储时 processSurrogate/* 不可用
    errorMsg.value = `委托功能不可用：${(e as Error).message}（后端需注册扩展仓储）`
  } finally {
    loading.value = false
  }
}

function go(p: number) {
  pageNum.value = p
  reload()
}

function openForm(s?: SurrogateRow) {
  formId.value = s?.id ?? null
  form.value = {
    processName: s?.processName ?? '',
    surrogate: s?.surrogate ?? '',
    startTime: s?.startTime ? s.startTime.slice(0, 16) : '',
    endTime: s?.endTime ? s.endTime.slice(0, 16) : '',
    enabled: s?.enabled ?? 1,
  }
  formVisible.value = true
}

async function save() {
  if (!form.value.surrogate || !form.value.startTime || !form.value.endTime) {
    window.alert('被委托人/生效时间/失效时间必填')
    return
  }
  saving.value = true
  try {
    const payload: Record<string, any> = {
      ...form.value,
      startTime: form.value.startTime ? form.value.startTime.replace('T', ' ') + ':00' : null,
      endTime: form.value.endTime ? form.value.endTime.replace('T', ' ') + ':00' : null,
    }
    if (formId.value) payload.id = formId.value
    await api.processSurrogate.save(payload)
    formVisible.value = false
    reload()
  } finally {
    saving.value = false
  }
}

async function remove(s: SurrogateRow) {
  if (!window.confirm('确认删除该委托？')) return
  await api.processSurrogate.remove(s.id)
  reload()
}

onMounted(reload)
</script>
