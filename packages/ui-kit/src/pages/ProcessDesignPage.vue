<template>
  <div class="jf-page">
    <h2 class="jf-page-title">
      流程设计
      <button v-if="can(['wf:processDesign:save'])" class="jf-btn jf-btn--primary jf-btn--sm" @click="createNew">＋ 新建流程</button>
    </h2>

    <!-- 设计列表 -->
    <template v-if="!designing">
      <div v-if="loading" class="jf-loading">加载中...</div>
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

    <!-- 设计器（阶段 1 最小可用：加载/保存草稿/发布） -->
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
      <div class="jf-designer-body" ref="designerHost">
        <div class="jf-loading">设计器加载中（mldong-flow-designer-plus 编辑模式）...</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import JfBadge from '../ui/JfBadge.vue'
import { useJeeflowUi } from '../provider'
import { fmtTime } from '../helpers'
import type { DesignRow } from '../types'

defineOptions({ name: 'JfProcessDesignPage' })

const { api, can } = useJeeflowUi()

const loading = ref(false)
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
const saving = ref(false)
const designerHost = ref<HTMLElement | null>(null)

async function reload() {
  loading.value = true
  try {
    const r = await api.processDesign.page({ pageNum: pageNum.value, pageSize, orderBy: 't.update_time desc' })
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

async function createNew() {
  design.value = { id: '', name: '', displayName: '', type: 'approval', isDeployed: 0, jsonObject: null }
  designName.value = ''
  designDisplayName.value = ''
  designing.value = true
  await nextTick()
  mountDesigner(null)
}

async function edit(d: DesignRow) {
  const detail = await api.processDesign.detail(d.id)
  design.value = { ...d, jsonObject: detail.jsonObject }
  designName.value = d.name
  designDisplayName.value = d.displayName
  designing.value = true
  await nextTick()
  mountDesigner(detail.jsonObject)
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

/**
 * 设计器挂载（阶段 1 最小可用）：动态 import mldong-flow-designer-plus 编辑模式。
 * 属性面板/保存联动在阶段 2 完善（对齐 vben5 designer.vue）。
 */
async function mountDesigner(graph: any) {
  if (!designerHost.value) return
  designerHost.value.innerHTML = ''
  try {
    // 简单方式：无画布数据时显示提示；有数据时以只读预览兜底（编辑模式接入见阶段 2）
    if (!graph) {
      designerHost.value.innerHTML = '<div style="padding:24px;color:#888">新建设计：请使用设计器画图（编辑模式阶段 2 接入）</div>'
    } else {
      designerHost.value.innerHTML = '<div style="padding:24px;color:#888">设计器编辑模式（阶段 2 接入）：当前显示只读占位</div>'
    }
  } catch (e) {
    designerHost.value.innerHTML = `<div style="padding:24px;color:#c33">设计器加载失败：${(e as Error).message}</div>`
  }
}

async function saveDraft() {
  saving.value = true
  try {
    // 阶段 1：无画布数据时仅保存基本信息（内容由设计器编辑模式提供）
    if (!design.value?.id) {
      const r = await api.processDesign.save({
        name: designName.value,
        displayName: designDisplayName.value,
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

async function saveAndDeploy() {
  await saveDraft()
  if (design.value?.id) {
    await api.processDesign.deploy(design.value.id)
    reload()
  }
}

onMounted(reload)
</script>
