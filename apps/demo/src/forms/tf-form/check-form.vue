<template>
  <div v-if="view" class="jf-schema-form">
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">票据齐全</label>
      <div class="jf-detail-text">{{ invoiceLabel }}</div>
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">核定金额（元）</label>
      <div class="jf-detail-text">{{ modelValue.tf_amountChecked ?? '-' }}</div>
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">财务审核意见</label>
      <div class="jf-detail-text">{{ modelValue.tf_checkNote || '-' }}</div>
    </div>
  </div>
  <div v-else class="jf-schema-form">
    <h3 class="jf-section-title">财务审核（任务表单）</h3>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">票据齐全 <span class="jf-req">*</span></label>
      <select v-model="modelValue.tf_invoiceOk" class="jf-input">
        <option value="">请选择</option>
        <option value="yes">齐全</option>
        <option value="no">缺票</option>
      </select>
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">核定金额（元）</label>
      <input v-model.number="modelValue.tf_amountChecked" class="jf-input" type="number" min="0" placeholder="财务核定的金额" />
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">财务审核意见</label>
      <textarea v-model="modelValue.tf_checkNote" class="jf-input" rows="2" placeholder="科目、票据与预算口径说明" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

defineOptions({ name: 'CheckForm' })

const props = defineProps({
  view: { type: Boolean, default: false },
  task: { type: Object, default: null },
})
const modelValue = defineModel({ type: Object, default: () => ({}) })

const INVOICE = { yes: '齐全', no: '缺票' }
const invoiceLabel = computed(() => INVOICE[modelValue.value.tf_invoiceOk] || modelValue.value.tf_invoiceOk || '-')

function validate() {
  if (props.view) return null
  if (!modelValue.value.tf_invoiceOk) return '请选择票据是否齐全'
  return null
}
defineExpose({ validate })
</script>
