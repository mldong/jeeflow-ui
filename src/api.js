// API 层 — 所有后端统一使用 boot2 兼容接口（code=0 成功 / 99999999 失败，字段 code/msg/data），全部走 CORS 直连
let _base = localStorage.getItem('jeeflow_backend') || 'http://localhost:8100'

export function getBase() { return _base }
export function setBase(url) { _base = url; localStorage.setItem('jeeflow_backend', url) }

/** boot2 CommonResult 校验：code=0 成功，否则抛错（msg） */
function check(r) {
  if (r && r.code === 0) return r
  throw new Error((r && r.msg) || '请求失败')
}

async function post(path, body = {}) {
  const r = await fetch(_base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return check(await r.json())
}

// ── Stats ────────────────────────────────────────────────────────────────────────
export async function fetchStats(userId = 'user1') {
  const r = await fetch(_base + '/api/stats?userId=' + userId)
  return check(await r.json()).data || {}
}

// ── Demo 辅助（issues/11）─────────────────────────────────────────────────────────
export async function fetchReset() {
  return post('/api/reset', {})
}

// ── Process Define ───────────────────────────────────────────────────────────────
export async function fetchDefines() {
  const r = await post('/wf/processDefine/page', { pageNum: 1, pageSize: 50 })
  return (r.data?.rows || []).map(d => ({ id: d.id, name: d.name, displayName: d.displayName }))
}

export async function fetchDefineDetail(id) {
  const r = await post('/wf/processDefine/detail', { id: String(id) })
  const d = r.data || null
  if (d && d.jsonObject && !d.graphData) d.graphData = d.jsonObject // boot2 ProcessDefineVO.jsonObject
  return d
}

// ── Process Instance ─────────────────────────────────────────────────────────────
export async function startFlow(defineId, operator, amount) {
  const body = { processDefineId: defineId, operator }
  if (amount !== undefined && amount !== '') body.amount = Number(amount)
  return post('/wf/processDefine/startAndExecute', body) // boot2 主入口
}

export async function fetchInstances(userId = 'user1') {
  const r = await post('/wf/processInstance/page', { pageNum: 1, pageSize: 50, operator: userId })
  return (r.data?.rows || []).map(i => ({
    id: i.id, state: i.state, operator: i.operator,
    defineName: i.displayName || i.processDefineDisplayName || '',
    businessNo: i.businessNo, createTime: i.createTime,
  }))
}

export async function fetchInstanceDetail(id) {
  const r = await post('/wf/processInstance/detail', { id: String(id) })
  const d = r.data || null
  if (d && d.jsonObject && !d.graphData) d.graphData = d.jsonObject
  return d
}

// boot2 独立端点：审批记录
export async function fetchApprovalRecord(instanceId) {
  const r = await post('/wf/processInstance/approvalRecord', { id: String(instanceId) })
  return r.data || []
}

// boot2 独立端点：高亮数据
export async function fetchHighLight(instanceId) {
  const r = await post('/wf/processInstance/highLight', { id: String(instanceId) })
  return r.data || { historyNodeNames: [], historyEdgeNames: [], activeNodeNames: [] }
}

// ── Process Task ─────────────────────────────────────────────────────────────────
export async function fetchTodoList(userId = 'user1') {
  // 门面契约统一 operator（issues/09：前端适配标准契约，不再依赖 demo 层归一化）
  const r = await post('/wf/processTask/todoList', { pageNum: 1, pageSize: 50, operator: userId })
  return (r.data?.rows || []).map(t => ({
    id: t.id, taskName: t.taskName, displayName: t.displayName,
    taskState: t.taskState, formKey: t.formKey, createTime: t.createTime,
    defineName: t.processDefineDisplayName || '',
    processInstanceId: t.processInstanceId,
  }))
}

// boot2 submitType: 0=APPLY, 1=AGREE, 2=REJECT, 3=ROLLBACK, 4=JUMP, 5=RE_APPLY, 6=ROLLBACK_TO_OPERATOR, 20=COUNTERSIGN_DISAGREE
export async function executeTask(taskId, operator, submitType = 1, extra = {}) {
  return post('/wf/processTask/execute', { processTaskId: taskId, operator, submitType, ...extra })
}
