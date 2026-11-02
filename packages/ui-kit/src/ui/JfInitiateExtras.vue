<template>
  <div v-if="flags.any || addSignAllowed" class="jf-extras">
    <div v-if="flags.selectUser && !hideOperator && !addSignChecked" class="jf-form-item">
      <label class="jf-form-label">指定下一节点处理人</label>
      <JfUserPicker
        :model-value="nextOperators"
        :task-id="taskId"
        scene="nextOperator"
        :disabled="disabled"
        placeholder="搜索并选择处理人"
        @update:model-value="emit('update:nextOperators', $event)"
      />
    </div>
    <!-- 后加签（可重复）：节点 properties.allowAddSign 为真才出现，是「同意」的附属效果，不是新按钮 -->
    <div v-if="addSignAllowed && !hideOperator" class="jf-form-item">
      <label class="jf-form-label jf-checkbox">
        <input
          type="checkbox"
          :disabled="disabled"
          :checked="addSignChecked"
          @change="emit('update:addSignChecked', ($event.target as HTMLInputElement).checked)"
        />
        加签给下一位
      </label>
      <JfUserPicker
        v-if="addSignChecked"
        :model-value="addSignOperators"
        :task-id="taskId"
        scene="nextOperator"
        :disabled="disabled"
        placeholder="搜索并选择加签人（可多选）"
        @update:model-value="emit('update:addSignOperators', $event)"
      />
    </div>
    <div v-if="flags.cc" class="jf-form-item">
      <label class="jf-form-label">抄送给</label>
      <JfUserPicker
        :model-value="ccActors"
        :task-id="taskId"
        scene="cc"
        :disabled="disabled"
        placeholder="搜索并选择抄送人"
        @update:model-value="emit('update:ccActors', $event)"
      />
    </div>
    <div v-if="flags.reason" class="jf-form-item">
      <label class="jf-form-label">申请理由</label>
      <textarea
        class="jf-input"
        rows="3"
        :disabled="disabled"
        :value="applyReason"
        placeholder="请输入申请理由"
        @input="emit('update:applyReason', ($event.target as HTMLTextAreaElement).value)"
      />
    </div>
    <div v-if="flags.attachment" class="jf-form-item">
      <label class="jf-form-label">附件</label>
      <input
        v-if="!disabled"
        class="jf-input"
        type="file"
        @change="onFile"
      />
      <div v-if="attachment" class="jf-muted" style="margin-top:4px">{{ attachment }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import JfUserPicker from './JfUserPicker.vue'
import { initiateExtraFlags } from '../helpers'
import { useJeeflowUi } from '../provider'

defineOptions({ name: 'JfInitiateExtras' })

const props = withDefaults(defineProps<{
  graph?: Record<string, any> | null
  taskId?: string | null
  disabled?: boolean
  /** 直返重提：下一节点由引擎钉死，隐藏"指定下一节点处理人"（抄送/理由/附件照旧） */
  hideOperator?: boolean
  /** 当前节点 properties.allowAddSign＝后加签开关（规范 02 §4.3），假则本组完全不出现 */
  addSignAllowed?: boolean
  /** "加签给下一位"勾选态（v-model） */
  addSignChecked?: boolean
  /** 加签人（多选，v-model） */
  addSignOperators?: string[]
  ccActors?: string[]
  nextOperators?: string[]
  applyReason?: string
  attachment?: string
}>(), {
  graph: null,
  taskId: null,
  disabled: false,
  hideOperator: false,
  addSignAllowed: false,
  addSignChecked: false,
  addSignOperators: () => [],
  ccActors: () => [],
  nextOperators: () => [],
  applyReason: '',
  attachment: '',
})

const emit = defineEmits<{
  'update:ccActors': [v: string[]]
  'update:nextOperators': [v: string[]]
  'update:addSignChecked': [v: boolean]
  'update:addSignOperators': [v: string[]]
  'update:applyReason': [v: string]
  'update:attachment': [v: string]
}>()

const flags = computed(() => initiateExtraFlags(props.graph))
const { adapters } = useJeeflowUi()

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) {
    emit('update:attachment', '')
    return
  }
  if (adapters.upload) {
    try {
      emit('update:attachment', await adapters.upload(file))
    } catch {
      emit('update:attachment', file.name)
    }
  } else {
    emit('update:attachment', file.name)
  }
}
</script>
