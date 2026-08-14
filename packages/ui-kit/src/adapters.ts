/**
 * 宿主适配器（@mldong/jeeflow-ui）
 *
 * 流程中心不绑宿主 REST（无 /sys/user/select）。选人 / 角色 / 字典 / 上传
 * 一律由宿主注入函数；缺哪个 adapter，对应控件降级或隐藏。
 *
 * 选人优先级（JfUserPicker）：
 *  1. scene=candidate 且有 taskId → 门面 processTask/candidatePage
 *  2. adapters.listUsers(keyword, ctx)
 *  3. 提示注入 listUsers
 *
 * 流程 JSON 里的 selectUserApi 只作为 ctx.apiHint 传给宿主，ui-kit 不直接 fetch。
 */

/** 与 JeeflowUiProvider / createJeeflowUi 共用，避免 SchemaForm ↔ provider 循环依赖 */
export const JeeflowUiKey = Symbol('jeeflow-ui')

/** 选人场景：办理候选走引擎；其余走宿主 listUsers */
export type JeeflowUserPickerScene =
  | 'candidate'
  | 'nextOperator'
  | 'cc'
  | 'surrogate'
  | 'assignee'

export interface JeeflowUserRow {
  userId: string
  realName: string
  deptName?: string
  postName?: string
  [key: string]: unknown
}

export interface JeeflowRoleRow {
  roleId: string
  roleName: string
  [key: string]: unknown
}

export interface JeeflowDictItem {
  value: string
  label: string
  [key: string]: unknown
}

export interface JeeflowListUsersContext {
  scene: JeeflowUserPickerScene
  taskId?: string | null
  /** 流程 JSON selectUserApi，仅 hint */
  apiHint?: string
}

export interface JeeflowHostAdapters {
  /** 无任务候选池时的选人（抄送/转办/委托/指定下一处理人/设计器指派） */
  listUsers?: (keyword: string, ctx: JeeflowListUsersContext) => Promise<JeeflowUserRow[]>
  /** 已选 id → 姓名（chips 回显；不传则显示 userId） */
  getUsersByIds?: (ids: string[]) => Promise<JeeflowUserRow[]>
  /** 设计器按角色指派；不传则角色指派隐藏 */
  listRoles?: (keyword: string) => Promise<JeeflowRoleRow[]>
  /** SchemaForm ApiDict / 设计器字典；不传则 ApiDict 退化为空下拉 */
  getDict?: (code: string) => Promise<JeeflowDictItem[]>
  /** 附件上传，返回可持久化 url/path；不传则只存文件名 */
  upload?: (file: File) => Promise<string>
}

/** 合并 adapters 与已废弃的顶层 listUsers */
export function resolveAdapters(config: {
  adapters?: JeeflowHostAdapters
  listUsers?: (keyword: string) => Promise<JeeflowUserRow[]>
}): JeeflowHostAdapters {
  const a = config.adapters || {}
  const legacy = config.listUsers
  return {
    ...a,
    listUsers: a.listUsers
      || (legacy ? (kw, _ctx) => legacy(kw) : undefined),
  }
}
