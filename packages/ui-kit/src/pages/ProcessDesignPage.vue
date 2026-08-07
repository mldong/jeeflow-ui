<template>
  <div class="jf-page jf-page--full">
    <h2 class="jf-page-title">
      流程设计
      <button v-if="can(['wf:processDesign:save'])" class="jf-btn jf-btn--primary jf-btn--sm" @click="createNew">＋ 新建流程</button>
    </h2>

    <!-- 设计列表 -->
    <template v-if="!designing">
      <div v-if="loading" class="jf-loading">加载中...</div>
      <div v-else-if="errorMsg" class="jf-empty">{{ errorMsg }}</div>
      <template v-else>
        <table v-if="rows.length" class="jf-table">
          <thead><tr><th>编码</th><th>显示名</th><th>类型</th><th>部署</th><th>更新时间</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="d in rows" :key="d.id">
              <td class="jf-muted">{{ d.name }}</td>
              <td><strong>{{ d.displayName }}</strong></td>
              <td class="jf-muted">{{ d.type }}</td>
              <td><JfBadge :type="d.isDeployed === 1 ? 'done' : 'info'">{{ d.isDeployed === 1 ? '已部署' : '未部署' }}</JfBadge></td>
              <td class="jf-muted">{{ fmtTime(d.updateTime || d.createTime, true) }}</td>
              <td>
                <div class="jf-btn-row">
                  <button class="jf-btn jf-btn--ghost jf-btn--sm" @click="edit(d)">编辑</button>
                  <button
                    v-if="can(['wf:processDesign:deploy'])"
                    class="jf-btn jf-btn--primary jf-btn--sm"
                    :disabled="d.isDeployed === 1"
                    @click="deploy(d)"
                  >{{ d.isDeployed === 1 ? '已发布' : '发布' }}</button>
                  <button
                    v-if="can(['wf:processDesign:remove'])"
                    class="jf-btn jf-btn--danger jf-btn--sm"
                    @click="remove(d)"
                  >删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="jf-empty">暂无流程设计</div>

        <div v-if="recordCount > pageSize" class="jf-pagination">
          <button class="jf-btn jf-btn--ghost jf-btn--sm" :disabled="pageNum <= 1" @click="go(pageNum - 1)">上一页</button>
          <span class="jf-muted">{{ pageNum }}/{{ totalPage }}（共 {{ recordCount }} 条）</span>
          <button class="jf-btn jf-btn--ghost jf-btn--sm" :disabled="pageNum >= totalPage" @click="go(pageNum + 1)">下一页</button>
        </div>
      </template>
    </template>

    <!-- 设计器（编辑模式：mldong-flow-designer-plus） -->
    <div v-else class="jf-designer-wrap">
      <div class="jf-designer-bar">
        <input v-model="designName" class="jf-input" placeholder="流程编码（唯一，如 leave）" style="width:200px" />
        <input v-model="designDisplayName" class="jf-input" placeholder="显示名（如 请假审批）" style="width:200px" />
        <span class="jf-muted" style="font-size:13px">{{ design?.isDeployed === 1 ? '（已发布，改动后需重新发布）' : '（未发布）' }}</span>
        <div style="flex:1"></div>
        <button class="jf-btn jf-btn--ghost" @click="designing = false">返回列表</button>
        <button class="jf-btn jf-btn--ghost" :disabled="saving" @click="saveDraft">保存草稿</button>
        <button class="jf-btn jf-btn--primary" :disabled="saving" @click="saveAndDeploy">保存并发布</button>
      </div>
      <div class="jf-designer-body">
        <FlowDesigner
          v-if="designing"
          v-model:value="designJson"
          mode="dingtalk"
          @on-save="handleDesignerSave"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import FlowDesigner from 'mldong-flow-designer-plus'
import 'mldong-flow-designer-plus/lib/style.css'
import JfBadge from '../ui/JfBadge.vue'
import { useJeeflowUi } from '../provider'
import { fmtTime } from '../helpers'
import type { DesignRow } from '../types'

defineOptions({ name: 'JfProcessDesignPage' })

const { api, can } = useJeeflowUi()

const loading = ref(false)
const errorMsg = ref('')
const rows = ref<DesignRow[]>([])
const pageNum = ref(1)
const pageSize = 10
const recordCount = ref(0)
const totalPage = ref(0)

// 设计器状态
const designing = ref(false)
const design = ref<DesignRow & { jsonObject?: any } | null>(null)
const designName = ref('')
const designDisplayName = ref('')
const designJson = ref<any>(null)
const saving = ref(false)

async function reload() {
  loading.value = true
  errorMsg.value = ''
  try {
    const r = await api.processDesign.page({ pageNum: pageNum.value, pageSize, orderBy: 't.update_time desc' })
    rows.value = r.rows
    recordCount.value = r.recordCount
    totalPage.value = r.totalPage
  } catch (e) {
    // 后端未注册扩展仓储（IProcessExtRepository）时 processDesign/* 不可用
    errorMsg.value = `流程设计功能不可用：${(e as Error).message}（后端需注册扩展仓储）`
  } finally {
    loading.value = false
  }
}

function go(p: number) {
  pageNum.value = p
  reload()
}

async function createNew() {
  design.value = { id: '', name: '', displayName: '', type: 'approval', isDeployed: 0, jsonObject: null }
  designName.value = ''
  designDisplayName.value = ''
  designJson.value = null
  designing.value = true
}

async function edit(d: DesignRow) {
  const detail = await api.processDesign.detail(d.id)
  design.value = { ...d, jsonObject: detail.jsonObject }
  designName.value = d.name
  designDisplayName.value = d.displayName
  // 设计器 v-model 数据：取最新设计稿内容（含 name/displayName/type 补齐）
  designJson.value = detail.jsonObject ? { ...detail.jsonObject } : null
  designing.value = true
}

async function deploy(d: DesignRow) {
  if (!window.confirm(`确认发布设计「${d.displayName}」？（生成流程定义，版本+1）`)) return
  await api.processDesign.deploy(d.id)
  reload()
}

async function remove(d: DesignRow) {
  if (!window.confirm(`确认删除设计「${d.displayName}」？`)) return
  await api.processDesign.remove(d.id)
  reload()
}

/** 设计器保存（@on-save）：先确保设计存在（新建先 save 拿 id），再 updateDefine 存草稿 */
async function handleDesignerSave(data: any) {
  saving.value = true
  try {
    if (!design.value?.id) {
      const r = await api.processDesign.save({
        name: designName.value || data?.name || 'new-flow',
        displayName: designDisplayName.value || data?.displayName || '新流程',
        type: data?.type || 'approval',
      })
      design.value = { ...design.value!, id: r.id, isDeployed: 0 }
    } else {
      await api.processDesign.update(design.value.id, {
        name: designName.value, displayName: designDisplayName.value,
      })
    }
    // 内容快照：流程 JSON（name/displayName/type 与顶部输入对齐）
    await api.processDesign.updateDefine(design.value.id, {
      ...data,
      name: designName.value || data?.name,
      displayName: designDisplayName.value || data?.displayName,
      type: data?.type || design.value?.type || 'approval',
    })
    reload()
  } finally {
    saving.value = false
  }
}

/** 保存草稿：以当前画布内容入库（未进设计器时仅保存基本信息） */
async function saveDraft() {
  if (designJson.value) {
    await handleDesignerSave(designJson.value)
  } else {
    saving.value = true
    try {
      if (!design.value?.id) {
        const r = await api.processDesign.save({
          name: designName.value || 'new-flow',
          displayName: designDisplayName.value || '新流程',
          type: 'approval',
        })
        design.value = { ...design.value!, id: r.id, isDeployed: 0 }
      } else {
        await api.processDesign.update(design.value.id, {
          name: designName.value, displayName: designDisplayName.value,
        })
      }
      reload()
    } finally {
      saving.value = false
    }
  }
}

/** 保存并发布：画布内容入库 + 生成流程定义（version+1） */
async function saveAndDeploy() {
  await saveDraft()
  if (design.value?.id) {
    await api.processDesign.deploy(design.value.id)
    reload()
  }
}

onMounted(reload)
</script>
