<template>
  <div v-if="view" class="jf-schema-form">
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">自查结论</label>
      <div class="jf-detail-text">{{ checkLabel }}</div>
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">自查说明</label>
      <div class="jf-detail-text">{{ modelValue.tf_operatorNote || '-' }}</div>
    </div>
  </div>
  <div v-else class="jf-schema-form">
    <h3 class="jf-section-title">发起人自审（任务表单）</h3>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">自查结论 <span class="jf-req">*</span></label>
      <select v-model="modelValue.tf_selfCheck" class="jf-input">
        <option value="">请选择</option>
        <option value="done">已自查无误</option>
        <option value="fix">待整改</option>
      </select>
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">自查说明</label>
      <textarea v-model="modelValue.tf_operatorNote" class="jf-input" rows="2" placeholder="处理人本人核对材料后的说明" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

defineOptions({ name: 'OperatorForm' })

const props = defineProps({
  view: { type: Boolean, default: false },
  task: { type: Object, default: null },
})
const modelValue = defineModel({ type: Object, default: () => ({}) })

const CHECKS = { done: '已自查无误', fix: '待整改' }
const checkLabel = computed(() => CHECKS[modelValue.value.tf_selfCheck] || modelValue.value.tf_selfCheck || '-')

function validate() {
  if (props.view) return null
  if (!modelValue.value.tf_selfCheck) return '请选择自查结论'
  return null
}
defineExpose({ validate })
</script>
