<template>
  <div v-if="view" class="jf-schema-form">
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">一票否决表决</label>
      <div class="jf-detail-text">{{ resultLabel }}</div>
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">否决理由</label>
      <div class="jf-detail-text">{{ modelValue.tf_vetoReason || '-' }}</div>
    </div>
  </div>
  <div v-else class="jf-schema-form">
    <h3 class="jf-section-title">一票否决会签（任务表单）</h3>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">表决 <span class="jf-req">*</span></label>
      <select v-model="modelValue.tf_vetoResult" class="jf-input">
        <option value="">请选择</option>
        <option value="pass">通过</option>
        <option value="veto">否决</option>
      </select>
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">否决理由</label>
      <textarea v-model="modelValue.tf_vetoReason" class="jf-input" rows="2" placeholder="选「否决」时必须写明理由" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

defineOptions({ name: 'VetoForm' })

const props = defineProps({
  view: { type: Boolean, default: false },
  task: { type: Object, default: null },
})
const modelValue = defineModel({ type: Object, default: () => ({}) })

const RESULTS = { pass: '通过', veto: '否决' }
const resultLabel = computed(() => RESULTS[modelValue.value.tf_vetoResult] || modelValue.value.tf_vetoResult || '-')

function validate() {
  if (props.view) return null
  if (!modelValue.value.tf_vetoResult) return '请选择表决结果'
  if (modelValue.value.tf_vetoResult === 'veto' && !String(modelValue.value.tf_vetoReason || '').trim()) {
    return '否决必须写明理由'
  }
  return null
}
defineExpose({ validate })
</script>
