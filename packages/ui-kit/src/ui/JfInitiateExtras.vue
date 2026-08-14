<template>
  <div v-if="flags.any" class="jf-extras">
    <div v-if="flags.selectUser" class="jf-form-item">
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
  ccActors?: string[]
  nextOperators?: string[]
  applyReason?: string
  attachment?: string
}>(), {
  graph: null,
  taskId: null,
  disabled: false,
  ccActors: () => [],
  nextOperators: () => [],
  applyReason: '',
  attachment: '',
})

const emit = defineEmits<{
  'update:ccActors': [v: string[]]
  'update:nextOperators': [v: string[]]
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
