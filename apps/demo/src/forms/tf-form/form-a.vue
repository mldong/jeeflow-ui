<template>
  <div v-if="view" class="jf-schema-form">
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">A 分支方案</label>
      <div class="jf-detail-text">{{ planLabel }}</div>
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">A 分支意见</label>
      <div class="jf-detail-text">{{ modelValue.tf_branchANote || '-' }}</div>
    </div>
  </div>
  <div v-else class="jf-schema-form">
    <h3 class="jf-section-title">A 审批（并行分支 A）</h3>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">A 分支方案 <span class="jf-req">*</span></label>
      <select v-model="modelValue.tf_branchA" class="jf-input">
        <option value="">请选择</option>
        <option value="a1">方案 A1</option>
        <option value="a2">方案 A2</option>
      </select>
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">A 分支意见</label>
      <textarea v-model="modelValue.tf_branchANote" class="jf-input" rows="2" placeholder="与 B 分支并行，汇合后统一看" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

defineOptions({ name: 'FormA' })

const props = defineProps({
  view: { type: Boolean, default: false },
  task: { type: Object, default: null },
})
const modelValue = defineModel({ type: Object, default: () => ({}) })

const PLANS = { a1: '方案 A1', a2: '方案 A2' }
const planLabel = computed(() => PLANS[modelValue.value.tf_branchA] || modelValue.value.tf_branchA || '-')

function validate() {
  if (props.view) return null
  if (!modelValue.value.tf_branchA) return '请选择 A 分支方案'
  return null
}
defineExpose({ validate })
</script>
