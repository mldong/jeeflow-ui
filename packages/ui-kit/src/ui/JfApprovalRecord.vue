<template>
  <div class="jf-approval">
    <div v-if="!records.length" class="jf-empty">暂无审批记录</div>
    <template v-else>
      <ul class="jf-timeline">
        <li v-for="(r, i) in records" :key="i" class="jf-timeline__item">
          <span class="jf-timeline__dot" :class="`jf-timeline__dot--${taskStateBadgeType(r.taskState)}`"></span>
          <div class="jf-timeline__content">
            <div class="jf-timeline__head">
              <strong>{{ r.displayName || r.taskName }}</strong>
              <span class="jf-muted">{{ fmtTime(r.finishTime, true) }}</span>
            </div>
            <div class="jf-timeline__meta">
              <span>{{ operatorOf(r) }}</span>
              <JfBadge :type="actionBadge(r)">{{ actionLabel(r) }}</JfBadge>
              <span v-if="commentOf(r) !== '-'" class="jf-muted">{{ commentOf(r) }}</span>
            </div>
            <!-- 后加签账本（tf_addSignHistory）：附加信息行，不占 submitType 徽标的坑 -->
            <div v-for="(h, hi) in addSignHistoryOf(r)" :key="'as' + hi" class="jf-timeline__extra">
              {{ addSignHistoryLabel(h) }}<span v-if="h.time"> · {{ h.time }}</span>
            </div>
            <!-- 动态协办账本（tf_aidantHistory，issues/253）：同族附加信息行，不占审批意见列 -->
            <div v-for="(h, hi) in aidantHistoryOf(r)" :key="'ad' + hi" class="jf-timeline__extra">
              {{ aidantHistoryLabel(h, nameOf) }}<span v-if="h.time"> · {{ h.time }}</span>
            </div>
          </div>
        </li>
      </ul>
      <table class="jf-table" style="margin-top:16px">
        <thead>
          <tr>
            <th>节点</th>
            <th>处理人</th>
            <th>操作</th>
            <th>意见</th>
            <th>时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in records" :key="'t'+i">
            <td><strong>{{ r.displayName || r.taskName }}</strong></td>
            <td>{{ operatorOf(r) }}</td>
            <td><JfBadge :type="actionBadge(r)">{{ actionLabel(r) }}</JfBadge></td>
            <td class="jf-muted">{{ commentOf(r) }}</td>
            <td class="jf-muted">{{ fmtTime(r.finishTime, true) }}</td>
          </tr>
        </tbody>
      </table>
    </template>
  </div>
</template>

<script setup lang="ts">
import { inject, ref, watch } from 'vue'
import JfBadge from './JfBadge.vue'
import { fmtTime, submitTypeLabel, taskStateBadgeType, addSignHistoryOf, addSignHistoryLabel, aidantHistoryOf, aidantHistoryLabel, actorIdTokens, resolveActorIdTokens } from '../helpers'
import { JeeflowUiKey } from '../adapters'
import type { JeeflowUiContext } from '../provider'
import type { ApprovalRecordRow } from '../types'

defineOptions({ name: 'JfApprovalRecord' })

const props = defineProps<{
  records: ApprovalRecordRow[]
}>()

// 宿主适配器可选注入： standalone 使用（无 Provider）时降级为显示原始 ID，不抛错
const ctx = inject<JeeflowUiContext | null>(JeeflowUiKey, null)
const nameMap = ref<Record<string, string>>({})

// 转办末跳文案 tf_approvalComment 里嵌的是 actor 雪花 ID（引擎按审计真相存 id）⇒
// 展示层借宿主 getUsersByIds 折成姓名（JfUserPicker chips 回显同族）；解析不到保留 ID。
watch(() => props.records, async (rows) => {
  const getUsersByIds = ctx?.adapters?.getUsersByIds
  if (!getUsersByIds) return
  const ids = Array.from(
    new Set([
      ...(rows || []).flatMap((r) => actorIdTokens(commentRaw(r))),
      // 协办账本 toActors 存的是用户 ID（作废轮同样带着被清场的那几个人）⇒ 一并送去折名
      ...(rows || []).flatMap((r) => aidantHistoryOf(r).flatMap(aidantActorIds)),
      // 作废协办子行只有裸 operator 可读 ⇒ 一并送去折名，解析不到仍退回 ID
      ...(rows || []).filter(abandonedAidantRow).map((r) => String(r.operator ?? '')),
    ].filter(Boolean)),
  )
  if (!ids.length) return
  try {
    const users = await getUsersByIds(ids)
    const map: Record<string, string> = {}
    for (const u of users) if (u?.userId && u?.realName) map[u.userId] = u.realName
    nameMap.value = map
  } catch { /* 回显失败仍显示 userId，不吞信息 */ }
}, { immediate: true, deep: true })

/** 协办子行随主办离开节点被作废（taskType=1 且 taskState=99）：引擎不给这类行投 u_realName／submitType，
 *  且 operator 恒空（没人办过），原样渲染就是一条空白项。owner 拍定**保留这一行**（作废是事实，不隐藏），
 *  只在展示层补一句实话；被征询的人由同节点账本条目的 toActors 出证（approvalRecord 投影不投 actor 列表，
 *  所以这一行的处理人列留空位，vben5 走 detail.tasks 时能就地折名——两处数据面不同，不是文案不同）。 */
function abandonedAidantRow(r: ApprovalRecordRow): boolean {
  return Number(r.taskType) === 1 && String(r.taskState ?? '') === '99'
}

/** 协办账本条目里的 actor ID 列表（数组或逗号串两形都吃），供批量折名 */
function aidantActorIds(entry: Record<string, any>): string[] {
  const raw = Array.isArray(entry.toActors)
    ? entry.toActors
    : String(entry.toActors ?? '').split(',').filter(Boolean)
  return raw.map((id: any) => String(id)).filter(Boolean)
}

function nameOf(id: string | null | undefined): string {
  const key = String(id ?? '')
  if (!key) return '-'
  return nameMap.value[key] || key
}

function operatorOf(r: ApprovalRecordRow): string {
  if (abandonedAidantRow(r)) return nameOf(r.operator)
  return (r.ext?.u_realName || r.operator || '-') as string
}

/** 动作位文案：作废协办行没有 submitType 可投，用一句话顶上，不出裸「-」 */
function actionLabel(r: ApprovalRecordRow): string {
  return abandonedAidantRow(r) ? '协办（未办结，离开节点时已作废）' : submitTypeLabel(submitOf(r))
}

function actionBadge(r: ApprovalRecordRow): 'doing' | 'done' | 'reject' | 'info' {
  return abandonedAidantRow(r) ? 'info' : submitBadge(r)
}

function submitOf(r: ApprovalRecordRow): number | string | null | undefined {
  return r.ext?.submitType
}

function commentRaw(r: ApprovalRecordRow): string {
  const v = r.ext?.tf_approvalComment
  return v != null && v !== '' ? String(v) : ''
}

function commentOf(r: ApprovalRecordRow): string {
  const raw = commentRaw(r)
  if (!raw) return '-'
  return resolveActorIdTokens(raw, (id) => nameMap.value[id] || id)
}

function submitBadge(r: ApprovalRecordRow): 'doing' | 'done' | 'reject' | 'info' {
  const s = Number(submitOf(r))
  if (s === 2 || s === 20) return 'reject'
  if (s === 1 || s === 0 || s === 5) return 'done'
  return 'info'
}
</script>
