<template>
  <div v-if="view" class="jf-schema-form">
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">审批结果</label>
      <div class="jf-detail-text">{{ resultLabel }}</div>
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">审批额度（元）</label>
      <div class="jf-detail-text">{{ modelValue.tf_approveAmount ?? '-' }}</div>
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">审批备注</label>
      <div class="jf-detail-text">{{ modelValue.tf_approveNote || '-' }}</div>
    </div>
  </div>
  <div v-else class="jf-schema-form">
    <h3 class="jf-section-title">审批（任务表单）</h3>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">审批结果 <span class="jf-req">*</span></label>
      <select v-model="modelValue.tf_approveResult" class="jf-input">
        <option value="">请选择</option>
        <option value="ok">同意</option>
        <option value="partial">部分同意</option>
        <option value="no">不同意</option>
      </select>
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">审批额度（元）</label>
      <input v-model.number="modelValue.tf_approveAmount" class="jf-input" type="number" min="0" placeholder="同意的额度" />
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">审批备注</label>
      <textarea v-model="modelValue.tf_approveNote" class="jf-input" rows="2" placeholder="审批备注（可选）" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

defineOptions({ name: 'ApproveForm' })

const props = defineProps({
  view: { type: Boolean, default: false },
  task: { type: Object, default: null },
})
const modelValue = defineModel({ type: Object, default: () => ({}) })

const RESULTS = { ok: '同意', partial: '部分同意', no: '不同意' }
const resultLabel = computed(() => RESULTS[modelValue.value.tf_approveResult] || modelValue.value.tf_approveResult || '-')

function validate() {
  if (props.view) return null
  if (!modelValue.value.tf_approveResult) return '请选择审批结果'
  return null
}
defineExpose({ validate })
</script>
