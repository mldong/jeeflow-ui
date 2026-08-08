/**
 * 轻量 toast（@mldong/jeeflow-ui）
 *
 * ui-kit 零 UI 框架依赖——成功/错误提示不引 Element Plus，
 * 宿主自带消息体系时可忽略此工具。
 */

interface ToastItem {
  id: number
  type: 'success' | 'error' | 'info'
  msg: string
}

let seq = 0
let host: HTMLDivElement | null = null
let list: ToastItem[] = []

function ensureHost(): HTMLDivElement {
  if (host && document.body.contains(host)) return host
  host = document.createElement('div')
  host.className = 'jf-toast-host'
  document.body.appendChild(host)
  return host
}

function render() {
  const el = ensureHost()
  el.innerHTML = list
    .map((t) => `<div class="jf-toast jf-toast--${t.type}">${escapeHtml(t.msg)}</div>`)
    .join('')
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

function show(type: ToastItem['type'], msg: string) {
  const id = ++seq
  list.push({ id, type, msg })
  render()
  setTimeout(() => {
    list = list.filter((t) => t.id !== id)
    render()
  }, 2600)
}

export const toast = {
  success: (msg: string) => show('success', msg),
  error: (msg: string) => show('error', msg),
  info: (msg: string) => show('info', msg),
}

/** 全局样式（style.css 引入后生效：.jf-toast-host/.jf-toast） */
