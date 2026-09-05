/**
 * 统一门面契约类型（@mldong/jeeflow-ui）
 *
 * 与 jeeflow-doc 规范 06 · 统一门面完整接口文档一一对应：
 *  - id 一律 string（雪花 id > 2^53，四语言出口已保证）
 *  - 时间一律 `yyyy-MM-dd HH:mm:ss`
 *  - 响应 `{code, msg, data}`：code=0 成功 / 99999999 业务失败
 *  - 分页 `{pageNum, pageSize, recordCount, totalPage, rows}`
 */

// ── 统一响应 ─────────────────────────────────────────────────────────────

export interface JeeflowResponse<T = unknown> {
  code: number
  msg: string
  data: T
}

export interface PageResult<T> {
  pageNum: number
  pageSize: number
  recordCount: number
  totalPage: number
  rows: T[]
}

/** 分页/过滤查询参数（m_ 前缀三段式过滤，见规范 06 §2.2） */
export interface PageQuery {
  pageNum?: number
  pageSize?: number
  orderBy?: string
  [key: string]: unknown
}

// ── 状态与类型枚举（规范 06 §2.8/2.9）─────────────────────────────────────

/** 执行类型（processTask/execute 的 submitType） */
export const SubmitType = {
  APPLY: 0,              // 发起申请
  AGREE: 1,              // 同意
  REJECT: 2,             // 拒绝（流程直接结束）
  ROLLBACK: 3,           // 退回上一步
  JUMP: 4,               // 跳转指定节点（需 taskName）
  RE_APPLY: 5,           // 重新提交
  ROLLBACK_TO_OPERATOR: 6, // 退回发起人
  COUNTERSIGN_DISAGREE: 20, // 会签拒绝
} as const
export type SubmitTypeValue = (typeof SubmitType)[keyof typeof SubmitType]

/** 任务状态 taskState / 实例状态 state */
export const TaskState = {
  DOING: 10,       // 进行中
  FINISHED: 20,    // 已完成
  WITHDRAW: 30,    // 已撤回
  INTERRUPT: 40,   // 强行终止
  PENDING: 50,     // 挂起
  ABANDON: 99,     // 已废弃
} as const
export type TaskStateValue = (typeof TaskState)[keyof typeof TaskState]

/** 参与方式 performType */
export const PerformType = {
  NORMAL: 0,       // 普通（多人任一完成即可）
  COUNTERSIGN: 1,  // 会签（每人独立任务，全部完成才推进）
} as const
export type PerformTypeValue = (typeof PerformType)[keyof typeof PerformType]

/** 会签模式 countersignType */
export const CountersignType = {
  PARALLEL: 'PARALLEL',       // 并行会签
  SEQUENTIAL: 'SEQUENTIAL',   // 串行会签
  RATIO: 'RATIO',             // 阈值会签
} as const

// ── 行结构（规范 06 §4）───────────────────────────────────────────────────

/** processDefine/page 行 */
export interface DefineRow {
  id: string
  name: string
  displayName: string
  type: string
  state: number          // 1 启用 / 0 停用
  version: number
  createTime?: string | null
  createUser?: string | null
  updateTime?: string | null
  updateUser?: string | null
}

export interface DefineDetail extends DefineRow {
  jsonObject?: Record<string, any> | null   // 流程 JSON 图（LogicFlow 模型）
}

/** processInstance/page 行 */
export interface InstanceRow {
  id: string
  parentId?: string | null
  processDefineId: string
  state: number
  parentNodeName?: string | null
  businessNo?: string | null
  operator?: string | null
  expireTime?: string | null
  variable?: Record<string, any> | null
  ext: Record<string, any>          // 实例变量（含 f_* 表单数据）
  displayName?: string | null
  version?: number | null
  processDefineName?: string | null
  processDefineDisplayName?: string | null
  processDefineVersion?: number | null
  createTime?: string | null
  createUser?: string | null
  updateTime?: string | null
  updateUser?: string | null
}

/** 任务行（taskVo，taskDetail/todoList/doneList 通用） */
export interface TaskRow {
  id: string
  processInstanceId: string
  taskName: string
  displayName: string
  taskType?: string | null
  performType?: number | null
  taskState: number
  operator?: string | null
  formKey?: string | null
  taskParentId?: string | null
  taskActorIdList?: string[]
  taskFormData?: Record<string, any>   // tf_* 任务表单数据（带前缀+去前缀副本）
  ext?: Record<string, any>            // 任务变量，为空回退实例变量
  instanceExt?: Record<string, any> | null
  finishTime?: string | null
  expireTime?: string | null
  createTime?: string | null
  processDefineName?: string | null
  processDefineDisplayName?: string | null
  version?: number | null
  [key: string]: unknown
}

/** processTask/detail 额外字段 */
export interface TaskDetail extends TaskRow {
  executable: boolean
  jsonObject?: Record<string, any> | null
  taskModel?: { name: string; displayName: string; type: string } | null
}

/** processInstance/detail */
export interface InstanceDetail {
  id: string
  parentId?: string | null
  processDefineId: string
  state: number
  parentNodeName?: string | null
  businessNo?: string | null
  operator?: string | null
  variables?: Record<string, any> | null
  formData?: Record<string, any>      // f_* 表单字段（带前缀+去前缀副本）
  displayName?: string | null
  name?: string | null
  version?: number | null
  jsonObject?: Record<string, any> | null
  tasks: TaskRow[]                    // 全量任务，ext.isFirstTaskNode 可"重新提交"
  activeTaskList: TaskRow[]           // 仅 DOING
  createTime?: string | null
  createUser?: string | null
}

/** processInstance/highLight */
export interface HighLightData {
  activeNodeNames: string[]
  historyNodeNames: string[]
  historyEdgeNames: string[]
  nodeProgress: Record<string, NodeProgress>
}

export interface NodeProgress {
  members: Array<{ id: string; name: string; done?: boolean; active?: boolean }>
  type?: 'PARALLEL' | 'SEQUENTIAL'
}

/** processInstance/approvalRecord 行 */
export interface ApprovalRecordRow {
  taskName: string
  displayName: string
  taskType?: string | null
  performType?: number | null
  taskState?: number | null
  operator?: string | null
  finishTime?: string | null
  variable?: Record<string, any> | null
  ext?: Record<string, any> | null
}

/** processDesign/page 行 */
export interface DesignRow {
  id: string
  name: string
  displayName: string
  type: string
  icon?: string | null
  isDeployed: number            // 1 已部署 / 0 未部署
  remark?: string | null
  createTime?: string | null
  createUser?: string | null
  updateTime?: string | null
  updateUser?: string | null
}

/** processDesign/listByType：{type: items[]} 或 boot3 转换后 [{type,title,items}] */
export interface ListByTypeItem {
  processDesignId: string
  name: string
  displayName: string
  icon?: string | null
  remark?: string | null
  processDefineId?: string | null   // 最新已发布定义 id（未发布 null）
  processDefineState?: number | null
  jsonObject?: Record<string, any> | null
}

/** processSurrogate/page 行 */
export interface SurrogateRow {
  id: string
  processName?: string | null
  operator?: string | null        // 授权人
  surrogate?: string | null       // 被委托人
  startTime?: string | null
  endTime?: string | null
  enabled?: number | null         // 1 启用 / 0 停用
  createTime?: string | null
  createUser?: string | null
  updateTime?: string | null
  updateUser?: string | null
}

/** processTask/candidatePage 行 */
export interface CandidateRow {
  userId: string
  realName: string
}

/** processTask/jumpAbleTaskNameList 行 */
export interface JumpableTaskRow {
  label: string
  value: string
}

/** processInstance/getAssigneeTextData 行 */
export interface AssigneeTextRow {
  value: string
  label: string
}

/** 流程 JSON 图（LogicFlow 模型，渲染/表单定位用） */
export interface FlowGraph {
  name?: string
  displayName?: string
  type?: string
  relTableName?: string
  persistMode?: string
  nodes: Array<{
    id: string
    type: string        // snaker:task 等
    x?: number
    y?: number
    properties?: Record<string, any>
    text?: { value?: string }
  }>
  edges: Array<{
    id: string
    sourceNodeId: string
    targetNodeId: string
    properties?: Record<string, any>
    text?: { value?: string }
  }>
}

// ── 统计接口（issues/103 v1.1 契约，spec 06 §4.2）──────────────────────────

/** stats/trend 时间粒度 */
export type StatsGranularity = 'hour' | 'day' | 'week' | 'month'

/** stats/group 维度（9 个全纯列） */
export type StatsDimension =
  | 'state' | 'define' | 'category' | 'approver' | 'applicant'
  | 'node' | 'stuckNode' | 'stuckApprover' | 'durationBucket'

/** stats/overview 指标卡（全局口径；expire_time 未填充时 overdueTaskCount/onTimeRate 恒 0，前端可隐藏） */
export interface StatsOverview {
  total: number
  inProgress: number
  completed: number
  rejected: number
  withdrawn: number
  suspended: number
  /** 当日新发起（恒按服务器当天，不受 start/end 影响） */
  todayNew: number
  /** 已完成实例平均时长（秒） */
  avgDurationSeconds: number
  /** 驳回率：rejected / max(1, completed+rejected) */
  rejectRate: number
  /** 全系统进行中任务数（实时） */
  pendingTaskCount: number
  /** 逾期未办任务数（实时；expire_time 未填充恒 0） */
  overdueTaskCount: number
  /** 会签占比（已完成任务） */
  countersignRate: number
  /** 及时办结率（expire_time 非空的已完成任务） */
  onTimeRate: number
}

/** stats/trend 行：连续桶补 0；bucket 格式随粒度（day=yyyy-MM-dd） */
export interface StatsTrendRow {
  bucket: string
  started: number
  finished: number
}

/** stats/group 行：count 降序；state 维度 label 可空（前端走字典） */
export interface StatsGroupRow {
  key: string
  label: string | null
  count: number
  /** 仅 define/node 维度有 */
  avgDurationSeconds?: number
}
