/**
 * 统一门面 API 层（@mldong/jeeflow-ui）
 *
 * 封装规范 06 的 40 个 action。**框架无关**：不依赖 Vue/axios——
 * 通过依赖注入接入任意宿主（baseUrl / token / 当前用户 / 权限码）。
 * Vue 宿主用 JeeflowUiProvider（provider.ts）注入；非 Vue 宿主可自行持有 api 实例。
 */

import type {
  JeeflowResponse, PageResult, PageQuery,
  DefineRow, DefineDetail, InstanceRow, InstanceDetail, TaskRow, TaskDetail,
  HighLightData, ApprovalRecordRow, DesignRow, ListByTypeItem, SurrogateRow,
  CandidateRow, JumpableTaskRow, AssigneeTextRow, SubmitTypeValue,
  StatsOverview, StatsTrendRow, StatsGroupRow, StatsGranularity, StatsDimension,
} from './types'
import type { JeeflowHostAdapters, JeeflowUserRow } from './adapters'

// ── 配置 ──────────────────────────────────────────────────────────────────

export interface JeeflowApiConfig {
  /** 后端根地址，如 http://localhost:8100（门面路由为 {baseUrl}/wf/{action}）；
   *  可传函数——每次请求时求值，支持宿主 SPA 内热切换后端 */
  baseUrl: string | (() => string)
  /** 当前用户 id 提供器——对应门面契约 operator（"我的"语义依赖） */
  getOperator: () => string
  /** 登录态提供器（可选）：注入 Authorization: Bearer <token> */
  getToken?: () => string | null
  /** 权限码判断器（可选）：宿主按 wf:{action} 权限码控制按钮显隐 */
  hasPermission?: (codes: string[]) => boolean
  /**
   * 宿主能力注入（选人 / 角色 / 字典 / 上传）。
   * ui-kit 不调用宿主 REST；缺哪个 adapter，对应控件降级。
   */
  adapters?: JeeflowHostAdapters
  /**
   * @deprecated 使用 adapters.listUsers。无任务上下文的选人回退。
   * 有 taskId 且 scene=candidate 时 JfUserPicker 仍走 candidatePage。
   */
  listUsers?: (keyword: string) => Promise<JeeflowUserRow[]>
  /** 自定义 fetch（可选）：测试注入/SSR/超时控制 */
  fetchImpl?: typeof fetch
  /** 请求拦截（可选）：统一加 header / 改 body */
  onRequest?: (action: string, body: Record<string, unknown>) => void
}

export class JeeflowApiError extends Error {
  code: number
  constructor(code: number, msg: string) {
    super(msg)
    this.code = code
  }
}

// ── 创建 API 实例 ─────────────────────────────────────────────────────────

export function createJeeflowApi(cfg: JeeflowApiConfig) {
  // 懒求值：baseUrl 传函数时每次请求取最新（宿主热切换后端无需重建 api）
  const resolveBaseUrl = () =>
    (typeof cfg.baseUrl === 'function' ? cfg.baseUrl() : cfg.baseUrl).replace(/\/+$/, '')
  const fetchImpl = cfg.fetchImpl ?? fetch

  async function flow<T = unknown>(action: string, args: Record<string, unknown> = {}): Promise<T> {
    const body: Record<string, unknown> = { ...args }
    // operator 自动注入（显式传参优先）
    if (!('operator' in body)) body.operator = cfg.getOperator()
    cfg.onRequest?.(action, body)
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const token = cfg.getToken?.()
    if (token) headers['Authorization'] = `Bearer ${token}`
    let resp: Response
    try {
      resp = await fetchImpl(`${resolveBaseUrl()}/wf/${action}`, {
        method: 'POST', headers, body: JSON.stringify(body),
      })
    } catch (e) {
      throw new JeeflowApiError(-1, `网络错误：${(e as Error).message}`)
    }
    let r: JeeflowResponse<T>
    try {
      r = (await resp.json()) as JeeflowResponse<T>
    } catch {
      throw new JeeflowApiError(resp.status, `非 JSON 响应（HTTP ${resp.status}）`)
    }
    if (r.code !== 0) throw new JeeflowApiError(r.code, r.msg || '请求失败')
    return r.data
  }

  /** 权限码判断（供组件控制按钮显隐；未注入 hasPermission 时默认放行） */
  function can(codes: string[]): boolean {
    if (!cfg.hasPermission) return true
    return cfg.hasPermission(codes)
  }

  const api = {
    /** 底层调用（自定义 action 扩展用） */
    flow,

    // ═══ 流程定义（7 action）═══
    processDefine: {
      page: (q: PageQuery = {}) =>
        flow<PageResult<DefineRow>>('processDefine/page', q),
      detail: (id: string) =>
        flow<DefineDetail>('processDefine/detail', { id }),
      startAndExecute: (defineId: string, formData: Record<string, unknown> = {}) =>
        flow<{ processInstanceId: string }>('processDefine/startAndExecute', {
          processDefineId: defineId, ...formData,
        }),
      /** 发布流程定义：流程 JSON 顶层展开（对齐 vben5；字符串 content 兼容） */
      deploy: (content: string | object) =>
        flow<{ processDefineId: string }>('processDefine/deploy',
          typeof content === 'string' ? { content } : { ...content }),
      /** 重新发布：流程 JSON 顶层展开（对齐 vben5；字符串 content 兼容） */
      redeploy: (defineId: string, content: string | object) =>
        flow<void>('processDefine/redeploy',
          typeof content === 'string'
            ? { processDefineId: defineId, content }
            : { processDefineId: defineId, ...content }),
      remove: (ids: string | string[]) =>
        flow<void>('processDefine/remove', Array.isArray(ids) ? { ids } : { id: ids }),
      upAndDown: (ids: string | string[], state: number) =>
        flow<void>('processDefine/upAndDown',
          Array.isArray(ids) ? { ids, state } : { id: ids, state }),
      getLastByName: (name: string) =>
        flow<DefineRow>('processDefine/getLastByName', { processDefineName: name }),
    },

    // ═══ 流程实例（11 action）═══
    processInstance: {
      page: (q: PageQuery = {}) =>
        flow<PageResult<InstanceRow>>('processInstance/page', q),
      detail: (id: string) =>
        flow<InstanceDetail>('processInstance/detail', { id }),
      startAndExecute: (defineId: string, formData: Record<string, unknown> = {}) =>
        flow<{ processInstanceId: string }>('processInstance/startAndExecute', {
          processDefineId: defineId, ...formData,
        }),
      withdraw: (id: string) =>
        flow<void>('processInstance/withdraw', { id }),
      bizData: (processInstanceId: string) =>
        flow<Record<string, any>>('processInstance/bizData', { processInstanceId }),
      highLight: (id: string) =>
        flow<HighLightData>('processInstance/highLight', { id }),
      approvalRecord: (id: string) =>
        flow<ApprovalRecordRow[]>('processInstance/approvalRecord', { id }),
      getAssigneeTextData: (id: string, includeNodeName = true) =>
        flow<AssigneeTextRow[]>('processInstance/getAssigneeTextData', { id, includeNodeName }),
      createCCInstance: (processInstanceId: string, actorIds: string[]) =>
        flow<void>('processInstance/createCCInstance', { processInstanceId, actorIds }),
      updateCCStatus: (processInstanceId: string) =>
        flow<void>('processInstance/updateCCStatus', { processInstanceId }),
      ccList: (q: PageQuery = {}) =>
        flow<PageResult<InstanceRow>>('processInstance/ccList', q),
      /** 指标卡统计（issues/103 v1.1；全局口径不带 operator 过滤；登录即可） */
      statsOverview: (q: { start?: string; end?: string; stateIn?: number[] } = {}) =>
        flow<StatsOverview>('processInstance/stats/overview', q),
      /** 时间趋势：start/end 必填（yyyy-MM-dd HH:mm:ss），连续桶补 0 */
      statsTrend: (q: { start: string; end: string; granularity: StatsGranularity }) =>
        flow<StatsTrendRow[]>('processInstance/stats/trend', q),
      /** 维度分组：9 个纯列 dimension，Top N 降序；stuckNode/stuckApprover 实时快照忽略 start/end */
      statsGroup: (q: { dimension: StatsDimension; start?: string; end?: string; limit?: number }) =>
        flow<StatsGroupRow[]>('processInstance/stats/group', q),
    },

    // ═══ 流程任务（9 action）═══
    processTask: {
      todoList: (q: PageQuery = {}) =>
        flow<PageResult<TaskRow>>('processTask/todoList', q),
      doneList: (q: PageQuery = {}) =>
        flow<PageResult<TaskRow>>('processTask/doneList', q),
      execute: (taskId: string, submitType: SubmitTypeValue,
        extra: Record<string, unknown> = {}) =>
        flow<void>('processTask/execute', { processTaskId: taskId, submitType, ...extra }),
      detail: (id: string) =>
        flow<TaskDetail>('processTask/detail', { id }),
      jumpAbleTaskNameList: (processInstanceId: string) =>
        flow<JumpableTaskRow[]>('processTask/jumpAbleTaskNameList', { processInstanceId }),
      candidatePage: (processTaskId: string, q: PageQuery = {}) =>
        flow<PageResult<CandidateRow>>('processTask/candidatePage', { processTaskId, ...q }),
      surrogate: (processTaskId: string, actorIds: string[]) =>
        flow<void>('processTask/surrogate', { processTaskId, actorIds }),
      addCandidate: (processTaskId: string, actorIds: string[]) =>
        flow<void>('processTask/addCandidate', { processTaskId, actorIds }),
      latest: (processInstanceId: string) =>
        flow<TaskRow | null>('processTask/latest', { processInstanceId }),
    },

    // ═══ 流程设计（9 action）═══
    processDesign: {
      page: (q: PageQuery = {}) =>
        flow<PageResult<DesignRow>>('processDesign/page', q),
      detail: (id: string) =>
        flow<DesignRow & { jsonObject?: Record<string, any>; his?: unknown[] }>(
          'processDesign/detail', { id }),
      save: (design: Record<string, unknown>) =>
        flow<{ id: string }>('processDesign/save', design),
      update: (id: string, fields: Record<string, unknown>) =>
        flow<void>('processDesign/update', { id, ...fields }),
      /** 保存设计稿：流程 JSON 顶层展开（对齐 vben5 契约；字符串 content 兼容） */
      updateDefine: (processDesignId: string, json: string | object) =>
        flow<void>('processDesign/updateDefine',
          typeof json === 'string'
            ? { processDesignId, content: json }
            : { processDesignId, ...json }),
      remove: (ids: string | string[]) =>
        flow<void>('processDesign/remove', Array.isArray(ids) ? { ids } : { id: ids }),
      deploy: (id: string) =>
        flow<{ processDefineId: string }>('processDesign/deploy', { id }),
      redeploy: (id: string) =>
        flow<{ processDefineId: string }>('processDesign/redeploy', { id }),
      /** 按类型分组（返回 Map<type, items>；boot3 前端转换见 guide） */
      listByType: () =>
        flow<Record<string, ListByTypeItem[]>>('processDesign/listByType'),
      /** listByType 的 boot3 形态（[{type,title,items}]），与参考实现转发层一致 */
      listByTypeAsArray: async () => {
        const groups = await api.processDesign.listByType()
        return Object.entries(groups).map(([type, items]) => ({ type, title: '', items }))
      },
    },

    // ═══ 委托代理（3 action）═══
    processSurrogate: {
      page: (q: PageQuery = {}) =>
        flow<PageResult<SurrogateRow>>('processSurrogate/page', q),
      save: (surrogate: Record<string, unknown>) =>
        flow<{ id: string }>('processSurrogate/save', surrogate),
      remove: (id: string) =>
        flow<void>('processSurrogate/remove', { id }),
    },
  }

  return { api, can }
}

export type JeeflowApi = ReturnType<typeof createJeeflowApi>['api']
export type JeeflowCan = ReturnType<typeof createJeeflowApi>['can']
