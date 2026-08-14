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
              <JfBadge :type="submitBadge(r)">{{ submitTypeLabel(submitOf(r)) }}</JfBadge>
              <span v-if="commentOf(r) !== '-'" class="jf-muted">{{ commentOf(r) }}</span>
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
            <td><JfBadge :type="submitBadge(r)">{{ submitTypeLabel(submitOf(r)) }}</JfBadge></td>
            <td class="jf-muted">{{ commentOf(r) }}</td>
            <td class="jf-muted">{{ fmtTime(r.finishTime, true) }}</td>
          </tr>
        </tbody>
      </table>
    </template>
  </div>
</template>

<script setup lang="ts">
import JfBadge from './JfBadge.vue'
import { fmtTime, submitTypeLabel, taskStateBadgeType } from '../helpers'
import type { ApprovalRecordRow } from '../types'

defineOptions({ name: 'JfApprovalRecord' })

defineProps<{
  records: ApprovalRecordRow[]
}>()

function operatorOf(r: ApprovalRecordRow): string {
  return (r.ext?.u_realName || r.operator || '-') as string
}

function submitOf(r: ApprovalRecordRow): unknown {
  return r.ext?.submitType ?? r.variable?.submitType
}

function commentOf(r: ApprovalRecordRow): string {
  const v = r.variable?.tf_approvalComment ?? r.ext?.tf_approvalComment
  return v != null && v !== '' ? String(v) : '-'
}

function submitBadge(r: ApprovalRecordRow): 'doing' | 'done' | 'reject' | 'info' {
  const s = Number(submitOf(r))
  if (s === 2 || s === 20) return 'reject'
  if (s === 1 || s === 0 || s === 5) return 'done'
  return 'info'
}
</script>
