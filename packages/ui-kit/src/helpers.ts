/**
 * 展示辅助（@mldong/jeeflow-ui）：状态标签/时间格式化（规范 06 §2.9 枚举）
 */

/** 实例状态 → 展示标签 */
export function stateLabel(s: number | string | null | undefined): string {
  const v = String(s)
  if (v === '10' || v === 'DOING') return '进行中'
  if (v === '20' || v === 'DONE' || v === 'FINISHED') return '已完成'
  if (v === '30' || v === 'WITHDRAW') return '已撤回'
  if (v === '40' || v === 'INTERRUPT') return '已终止'
  if (v === '45' || v === 'REJECT') return '已拒绝'
  if (v === '50' || v === 'PENDING') return '挂起'
  if (v === '99' || v === 'ABANDON') return '已废弃'
  return s != null ? String(s) : '-'
}

/** 实例状态 → JfBadge type */
export function stateBadgeType(s: number | string | null | undefined): 'doing' | 'done' | 'reject' | 'info' {
  const v = String(s)
  if (v === '10' || v === 'DOING') return 'doing'
  if (v === '20' || v === 'DONE' || v === 'FINISHED') return 'done'
  if (v === '45' || v === 'REJECT' || v === '99') return 'reject'
  return 'info'
}

/** 任务状态 → 展示标签 */
export function taskStateLabel(s: number | string | null | undefined): string {
  const v = String(s)
  if (v === '10' || v === 'DOING') return '待办'
  if (v === '20' || v === 'FINISHED') return '已完成'
  if (v === '99' || v === 'ABANDON') return '已废弃'
  if (v === '30' || v === 'WITHDRAW') return '已撤回'
  if (v === '40' || v === 'INTERRUPT') return '已终止'
  return s != null ? String(s) : '-'
}

/** 任务状态 → JfBadge type */
export function taskStateBadgeType(s: number | string | null | undefined): 'doing' | 'done' | 'reject' | 'info' {
  const v = String(s)
  if (v === '10' || v === 'DOING') return 'doing'
  if (v === '20' || v === 'FINISHED') return 'done'
  if (v === '99' || v === 'ABANDON') return 'reject'
  return 'info'
}

/** 时间格式化：yyyy-MM-dd HH:mm:ss 或宽松（非法时间原样返回） */
export function fmtTime(t: string | null | undefined, short = false): string {
  if (!t) return ''
  const d = new Date(t)
  if (isNaN(d.getTime())) return t
  if (short) {
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** 流程 JSON 图中首个任务节点的 formKey（发起表单定位） */
export function firstTaskFormKey(graph: any): string {
  for (const n of graph?.nodes || []) {
    if (n?.type === 'snaker:task' && n?.properties?.form) return n.properties.form
  }
  return ''
}

/** 流程 JSON 图中任务节点列表（发起页 groupByType 需要） */
export function taskNodes(graph: any): Array<{ id: string; displayName: string; form?: string }> {
  const out: Array<{ id: string; displayName: string; form?: string }> = []
  for (const n of graph?.nodes || []) {
    if (n?.type === 'snaker:task') {
      out.push({ id: n.id, displayName: n.text?.value || n.id, form: n.properties?.form })
    }
  }
  return out
}
