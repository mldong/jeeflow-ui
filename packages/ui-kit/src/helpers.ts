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

/** 是否任务节点（snaker:task / task） */
function isTaskType(type: unknown): boolean {
  return type === 'snaker:task' || type === 'task'
}

/** 流程 JSON 图中 start 的下一个任务节点（对齐 vben5 getFirstTaskNode） */
export function firstTaskNode(graph: any): any | null {
  const nodes: any[] = graph?.nodes || []
  const edges: any[] = graph?.edges || []
  const start = nodes.find((n) => n?.type === 'snaker:start' || n?.type === 'start')
  if (start) {
    const edge = edges.find((e) => e.sourceNodeId === start.id)
    if (edge) {
      const target = nodes.find((n) => n.id === edge.targetNodeId && isTaskType(n?.type))
      if (target) return target
    }
  }
  return nodes.find((n) => isTaskType(n?.type)) || null
}

/** 按 taskName / 节点 id 定位任务节点 */
export function findTaskNode(graph: any, taskName?: string | null): any | null {
  if (!taskName) return null
  const nodes: any[] = graph?.nodes || []
  return nodes.find((n) =>
    isTaskType(n?.type) && (n.id === taskName || n.properties?.name === taskName || n.text?.value === taskName),
  ) || null
}

/** 流程 JSON 图中首个任务节点的 formKey（发起表单定位） */
export function firstTaskFormKey(graph: any): string {
  const n = firstTaskNode(graph)
  if (n?.properties?.form) return n.properties.form
  for (const node of graph?.nodes || []) {
    if (isTaskType(node?.type) && node?.properties?.form) return node.properties.form
  }
  const url = graph?.instanceUrl
  if (typeof url === 'string' && url && !url.includes('/')) return url
  return ''
}

/** 流程 JSON 图中任务节点列表（发起页 groupByType 需要） */
export function taskNodes(graph: any): Array<{ id: string; displayName: string; form?: string }> {
  const out: Array<{ id: string; displayName: string; form?: string }> = []
  for (const n of graph?.nodes || []) {
    if (isTaskType(n?.type)) {
      out.push({ id: n.id, displayName: n.text?.value || n.id, form: n.properties?.form })
    }
  }
  return out
}

/** 字段权限：1 只读 / 2 可编 / 3 隐藏 */
export const FieldPerm = { READ_ONLY: 1, EDIT: 2, HIDDEN: 3 } as const
export type FieldPermValue = (typeof FieldPerm)[keyof typeof FieldPerm]

function truthyFlag(v: unknown): boolean {
  return v === 1 || v === true || v === '1'
}

/** 解析 __schema__：优先 vben5 columns，兼容旧 fields */
export interface SchemaColumn {
  fieldName: string
  remark: string
  component: string
  ext?: {
    span?: number
    required?: number | boolean
    placeholder?: string
    options?: Array<{ label: string; value: string | number }>
    [key: string]: unknown
  }
}

export interface ParsedSchema {
  layout?: string
  columns: SchemaColumn[]
}

export function parseSchema(graph: any): ParsedSchema | null {
  const raw = graph?.__schema__
  if (!raw || typeof raw !== 'object') return null
  const layout = raw.ext?.layout
  if (Array.isArray(raw.columns) && raw.columns.length) {
    return {
      layout,
      columns: raw.columns.map((c: any) => ({
        fieldName: String(c.fieldName || c.fieldCamelName || '').replace(/^f_/, ''),
        remark: c.remark || c.label || c.fieldName || '',
        component: c.component || 'Input',
        ext: c.ext || {},
      })).filter((c: SchemaColumn) => c.fieldName),
    }
  }
  if (Array.isArray(raw.fields) && raw.fields.length) {
    return {
      layout,
      columns: raw.fields.map((f: any) => ({
        fieldName: String(f.key || f.fieldName || '').replace(/^f_/, ''),
        remark: f.label || f.remark || f.key || '',
        component: f.component || 'Input',
        ext: f.ext || {},
      })).filter((c: SchemaColumn) => c.fieldName),
    }
  }
  return null
}

/** 从 schema 提取 fieldLabels（兼容旧 SchemaForm fieldLabels 用法） */
export function schemaFieldLabels(graph: any, prefix = 'f_'): Record<string, string> {
  const parsed = parseSchema(graph)
  if (!parsed) return {}
  const labels: Record<string, string> = {}
  for (const c of parsed.columns) {
    labels[`${prefix}${c.fieldName}`] = c.remark || c.fieldName
    labels[c.fieldName] = c.remark || c.fieldName
  }
  return labels
}

/**
 * 解析节点字段权限。enableFieldPerm 未开则一律可编。
 * 键优先 PERMISSION_f_{name}，再 PERMISSION_{name}（集成规范双格式）。
 */
export function resolveFieldPerm(graph: any, taskNode: any, fieldName: string): FieldPermValue {
  if (!truthyFlag(graph?.enableFieldPerm)) return FieldPerm.EDIT
  const field = taskNode?.properties?.field || taskNode?.ext || {}
  const bare = String(fieldName).replace(/^f_/, '').replace(/^tf_/, '')
  for (const k of [`PERMISSION_f_${bare}`, `PERMISSION_${bare}`, `PERMISSION_tf_${bare}`]) {
    const v = Number(field[k])
    if (v === 1 || v === 2 || v === 3) return v as FieldPermValue
  }
  return FieldPerm.EDIT
}

/** 列 → fieldName 权限表（同时写入裸名与 f_ 前缀，方便 SchemaForm 查找） */
export function buildPermissionMap(graph: any, taskNode: any, columns?: SchemaColumn[]): Record<string, FieldPermValue> {
  const map: Record<string, FieldPermValue> = {}
  const cols = columns ?? parseSchema(graph)?.columns ?? []
  for (const c of cols) {
    const perm = resolveFieldPerm(graph, taskNode, c.fieldName)
    map[c.fieldName] = perm
    map[`f_${c.fieldName}`] = perm
  }
  return map
}

export type ActionBtnKey =
  | 'AGREE'
  | 'REJECT'
  | 'ROLLBACK'
  | 'ROLLBACK_TO_OPERATOR'
  | 'JUMP'
  | 'COUNTERSIGN_DISAGREE'
  | 'ADD_CANDIDATE'
  | 'SURROGATE'

export function isCountersign(performType: unknown): boolean {
  return performType === 1 || performType === '1' || performType === 'COUNTERSIGN' || performType === 'ALL'
}

/** 有 actionBtns 用配置；否则按会签/普通给默认集 */
export function resolveActionBtns(taskNode: any, performType?: unknown): ActionBtnKey[] {
  const configured = taskNode?.properties?.actionBtns
  if (Array.isArray(configured) && configured.length) {
    return configured.filter((k: unknown) => typeof k === 'string') as ActionBtnKey[]
  }
  if (isCountersign(performType ?? taskNode?.properties?.performType)) {
    return ['AGREE', 'COUNTERSIGN_DISAGREE', 'ADD_CANDIDATE']
  }
  return ['AGREE', 'REJECT', 'ROLLBACK', 'ROLLBACK_TO_OPERATOR', 'JUMP']
}

/** submitType → 中文（无字典服务，写死对照表） */
export function submitTypeLabel(n: number | string | null | undefined): string {
  const map: Record<string, string> = {
    '0': '发起申请',
    '1': '同意',
    '2': '拒绝',
    '3': '退回上一步',
    '4': '跳转',
    '5': '重新提交',
    '6': '退回发起人',
    '20': '会签拒绝',
  }
  return map[String(n)] ?? (n != null ? String(n) : '-')
}

/** jsonObject 上的发起附加项开关 */
export function initiateExtraFlags(graph: any): {
  selectUser: boolean
  cc: boolean
  reason: boolean
  attachment: boolean
  any: boolean
} {
  const selectUser = truthyFlag(graph?.selectUserOnInitiate)
  const cc = truthyFlag(graph?.enableCcActors)
  const reason = truthyFlag(graph?.enableApplyReason)
  const attachment = truthyFlag(graph?.enableAttachment)
  return { selectUser, cc, reason, attachment, any: selectUser || cc || reason || attachment }
}

/** 从实例/任务变量里抽出 f_* 表单数据 */
export function extractBizFormData(source: any): Record<string, any> {
  if (!source) return {}
  let vars: Record<string, any> | null = null
  if (source.formData && typeof source.formData === 'object') vars = source.formData
  else if (source.instanceExt && typeof source.instanceExt === 'object') vars = source.instanceExt
  else if (source.ext && typeof source.ext === 'object') vars = source.ext
  else if (typeof source.instanceVariable === 'string') {
    try { vars = JSON.parse(source.instanceVariable) } catch { vars = null }
  } else if (source.variable && typeof source.variable === 'object') vars = source.variable
  if (!vars) return {}
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(vars)) {
    if (k.startsWith('f_')) out[k] = v
  }
  return out
}

/** SchemaWfForm / SchemaTfForm 是 vben5 元数据表单占位名，走内置 SchemaForm */
export function isBuiltinSchemaFormKey(formKey: string | null | undefined): boolean {
  return formKey === 'SchemaWfForm' || formKey === 'SchemaTfForm'
}
