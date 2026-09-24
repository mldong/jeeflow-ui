<template>
  <div v-if="view" class="jf-schema-form">
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">责任人</label>
      <div class="jf-detail-text">{{ modelValue.tf_ownerName || '-' }}</div>
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">责任领域</label>
      <div class="jf-detail-text">{{ fieldLabel }}</div>
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">领域意见</label>
      <div class="jf-detail-text">{{ modelValue.tf_fieldNote || '-' }}</div>
    </div>
  </div>
  <div v-else class="jf-schema-form">
    <h3 class="jf-section-title">按表单字段找人（任务表单）</h3>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">责任人 <span class="jf-req">*</span></label>
      <input v-model="modelValue.tf_ownerName" class="jf-input" placeholder="按表单字段解析出的责任人" />
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">责任领域</label>
      <select v-model="modelValue.tf_field" class="jf-input">
        <option value="">请选择</option>
        <option value="tech">技术</option>
        <option value="biz">业务</option>
      </select>
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">领域意见</label>
      <textarea v-model="modelValue.tf_fieldNote" class="jf-input" rows="2" placeholder="该领域的评估意见" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

defineOptions({ name: 'FieldForm' })

const props = defineProps({
  view: { type: Boolean, default: false },
  task: { type: Object, default: null },
})
const modelValue = defineModel({ type: Object, default: () => ({}) })

const FIELDS = { tech: '技术', biz: '业务' }
const fieldLabel = computed(() => FIELDS[modelValue.value.tf_field] || modelValue.value.tf_field || '-')

function validate() {
  if (props.view) return null
  if (!String(modelValue.value.tf_ownerName || '').trim()) return '请填写责任人'
  return null
}
defineExpose({ validate })
</script>
