<template>
  <div class="jup">
    <!-- 选择框：已选 chips + 搜索输入 -->
    <div class="jup-box" :class="{ 'jup-box--focus': focused }" @click="focusInput">
      <span v-for="uid in modelValue" :key="uid" class="jup-chip">
        {{ nameOf(uid) }}
        <i v-if="!disabled" class="jup-chip-x" @click.stop="remove(uid)">&times;</i>
      </span>
      <input
        ref="inputEl"
        v-model="keyword"
        class="jup-input"
        :placeholder="modelValue.length ? '' : placeholder"
        :disabled="disabled"
        @focus="onFocus"
        @blur="onBlur"
        @input="onInput"
      />
    </div>
    <!-- 搜索结果下拉 -->
    <div v-if="focused" class="jup-pop" @mousedown.prevent>
      <div v-if="searching" class="jup-tip">搜索中...</div>
      <div v-else-if="errorMsg" class="jup-tip">{{ errorMsg }}</div>
      <div v-else-if="!results.length" class="jup-tip">无匹配用户</div>
      <template v-else>
        <div
          v-for="u in results"
          :key="u.userId"
          class="jup-item"
          @click="pick(u)"
        >
          <span class="jup-item-avatar">{{ (u.realName || u.userId || '?').slice(0, 1) }}</span>
          <span class="jup-item-main">
            <span class="jup-item-name">{{ u.realName || u.userId }}</span>
            <span v-if="u.deptName || u.postName" class="jup-item-sub">
              {{ [u.deptName, u.postName].filter(Boolean).join(' · ') }}
            </span>
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useJeeflowUi } from '../provider'
import type { JeeflowUserPickerScene, JeeflowUserRow } from '../adapters'

defineOptions({ name: 'JfUserPicker' })

const props = withDefaults(defineProps<{
  /** 已选 userId 列表（v-model） */
  modelValue?: string[]
  /** 任务上下文：scene=candidate 时走 candidatePage */
  taskId?: string | null
  /** 选人场景；有 taskId 时默认 candidate，否则 cc */
  scene?: JeeflowUserPickerScene
  /** 流程 JSON selectUserApi，透传给 adapters.listUsers */
  apiHint?: string
  placeholder?: string
  disabled?: boolean
}>(), {
  modelValue: () => [],
  taskId: null,
  apiHint: '',
  placeholder: '输入姓名/工号搜索',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [v: string[]]
  change: [v: string[]]
}>()

const { api, adapters } = useJeeflowUi()

const inputEl = ref<HTMLInputElement | null>(null)
const keyword = ref('')
const focused = ref(false)
const searching = ref(false)
const errorMsg = ref('')
const results = ref<Array<Record<string, any>>>([])
const nameCache = reactive<Record<string, string>>({})

let timer: ReturnType<typeof setTimeout> | null = null

function nameOf(uid: string): string {
  return nameCache[uid] || uid
}

function focusInput() {
  if (!props.disabled) inputEl.value?.focus()
}

function onFocus() {
  focused.value = true
  search()
}

function onBlur() {
  focused.value = false
  keyword.value = ''
}

function onInput() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(search, 300)
}

const scene = computed<JeeflowUserPickerScene>(() =>
  props.scene || (props.taskId ? 'candidate' : 'cc'),
)

watch(() => props.modelValue.slice(), async (ids) => {
  const missing = ids.filter((id) => id && !nameCache[id])
  if (!missing.length || !adapters.getUsersByIds) return
  try {
    const rows = await adapters.getUsersByIds(missing)
    for (const u of rows) if (u?.userId && u?.realName) nameCache[u.userId] = u.realName
  } catch { /* 回显失败仍显示 userId */ }
}, { immediate: true })

/** 检索候选人：candidate+taskId → candidatePage；否则宿主 adapters.listUsers */
async function search() {
  searching.value = true
  errorMsg.value = ''
  try {
    const kw = keyword.value.trim()
    let rows: JeeflowUserRow[] = []
    const useEngine = !!props.taskId && scene.value === 'candidate'
    if (useEngine) {
      const r = await api.processTask.candidatePage(props.taskId!, {
        ...(kw ? { m_LIKE_realName: kw } : {}),
        pageNum: 1, pageSize: 10,
      })
      rows = r.rows as JeeflowUserRow[]
    } else if (adapters.listUsers) {
      rows = await adapters.listUsers(kw, {
        scene: scene.value,
        taskId: props.taskId,
        apiHint: props.apiHint || undefined,
      })
    } else {
      errorMsg.value = '无用户源：请在 provider.adapters 注入 listUsers'
    }
    for (const u of rows) if (u?.realName) nameCache[u.userId] = u.realName
    results.value = rows.filter((u) => !props.modelValue.includes(u.userId))
  } catch (e) {
    errorMsg.value = (e as Error).message || '用户搜索失败'
    results.value = []
  } finally {
    searching.value = false
  }
}

function pick(u: Record<string, any>) {
  const next = [...props.modelValue, u.userId]
  emit('update:modelValue', next)
  emit('change', next)
  keyword.value = ''
  results.value = results.value.filter((x) => x.userId !== u.userId)
  inputEl.value?.focus()
}

function remove(uid: string) {
  const next = props.modelValue.filter((x) => x !== uid)
  emit('update:modelValue', next)
  emit('change', next)
}
</script>

<style scoped>
.jup { position: relative; }
.jup-box {
  display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
  padding: 5px 10px; border: 1px solid var(--jf-border, #d9d9d9); border-radius: 6px;
  background: #fff; cursor: text; min-height: 36px;
}
.jup-box--focus { border-color: var(--jf-primary, #1677ff); }
.jup-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: 4px; font-size: 12px;
  background: var(--jf-chip-bg, #f0f5ff); color: var(--jf-primary, #1677ff);
}
.jup-chip-x { font-style: normal; cursor: pointer; opacity: .7; }
.jup-chip-x:hover { opacity: 1; }
.jup-input { flex: 1; min-width: 80px; border: none; outline: none; font-size: 13px; padding: 2px 0; }
.jup-pop {
  position: absolute; left: 0; right: 0; top: calc(100% + 4px); z-index: 20;
  background: #fff; border: 1px solid var(--jf-border, #f0f0f0); border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, .08); max-height: 260px; overflow-y: auto; padding: 4px;
}
.jup-tip { padding: 12px; font-size: 13px; color: #999; text-align: center; }
.jup-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 6px; cursor: pointer; }
.jup-item:hover { background: var(--jf-hover-bg, #f5f7fa); }
.jup-item-avatar {
  width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--jf-primary-soft, #e6f0ff); color: var(--jf-primary, #1677ff); font-size: 13px;
}
.jup-item-main { display: flex; flex-direction: column; min-width: 0; }
.jup-item-name { font-size: 13px; color: var(--jf-text, #1f1f1f); }
.jup-item-sub { font-size: 12px; color: #999; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
