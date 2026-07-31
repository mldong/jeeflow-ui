// API 层 — 所有后端统一使用 boot2 兼容接口，全部走 CORS 直连
let _base = localStorage.getItem('jeeflow_backend') || 'http://localhost:8100'

export function getBase() { return _base }
export function setBase(url) { _base = url; localStorage.setItem('jeeflow_backend', url) }

async function post(path, body = {}) {
  const url = _base + path
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return r.json()
}

// ── Stats ────────────────────────────────────────────────────────────────────────
export async function fetchStats(userId = 'user1') {
  const r = await fetch(_base + '/api/stats?userId=' + userId)
  return (await r.json()).data || {}
}

// ── Process Define ───────────────────────────────────────────────────────────────
export async function fetchDefines() {
  const r = await post('/wf/processDefine/page', { pageNum: 1, pageSize: 50 })
  return (r.data?.rows || []).map(d => ({ id: d.id, name: d.name, displayName: d.displayName }))
}

export async function fetchDefineDetail(id) {
  const r = await post('/wf/processDefine/detail', { id: String(id) })
  return r.data || null
}

// ── Process Instance ─────────────────────────────────────────────────────────────
export async function startFlow(defineId, operator, amount) {
  const body = { processDefineId: defineId, operator }
  if (amount !== undefined && amount !== '') body.amount = Number(amount)
  return post('/wf/processInstance/startAndExecute', body)
}

export async function fetchInstances(userId = 'user1') {
  const r = await post('/wf/processInstance/page', { pageNum: 1, pageSize: 50, operator: userId })
  return (r.data?.rows || []).map(i => ({
    id: i.id, state: i.state, operator: i.operator,
    defineName: i.processDefineDisplayName || '',
    businessNo: i.businessNo, createTime: i.createTime,
  }))
}

export async function fetchInstanceDetail(id) {
  const r = await post('/wf/processInstance/detail', { id: String(id) })
  return r.data || null
}

// ── Process Task ─────────────────────────────────────────────────────────────────
export async function fetchTodoList(userId = 'user1') {
  const r = await post('/wf/processTask/todoList', { pageNum: 1, pageSize: 50, userId })
  return (r.data?.rows || []).map(t => ({
    id: t.id, taskName: t.taskName, displayName: t.displayName,
    taskState: t.taskState, formKey: t.formKey, createTime: t.createTime,
    defineName: t.processDefineDisplayName || '',
    processInstanceId: t.processInstanceId,
  }))
}

// submitType: 1=AGREE, 2=REJECT (boot2: 0=APPLY, 1=AGREE, 2=REJECT)
export async function executeTask(taskId, operator, submitType = 1) {
  return post('/wf/processTask/execute', { processTaskId: taskId, operator, submitType })
}
