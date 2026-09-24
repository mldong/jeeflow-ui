<template>
  <div v-if="view" class="jf-schema-form">
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">角色审批结论</label>
      <div class="jf-detail-text">{{ resultLabel }}</div>
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">角色意见</label>
      <div class="jf-detail-text">{{ modelValue.tf_roleNote || '-' }}</div>
    </div>
  </div>
  <div v-else class="jf-schema-form">
    <h3 class="jf-section-title">按角色审批（任务表单）</h3>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">角色审批结论 <span class="jf-req">*</span></label>
      <select v-model="modelValue.tf_roleResult" class="jf-input">
        <option value="">请选择</option>
        <option value="pass">通过</option>
        <option value="back">退回补充</option>
      </select>
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">角色意见</label>
      <textarea v-model="modelValue.tf_roleNote" class="jf-input" rows="2" placeholder="以角色身份给出的结论说明" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

defineOptions({ name: 'RoleForm' })

const props = defineProps({
  view: { type: Boolean, default: false },
  task: { type: Object, default: null },
})
const modelValue = defineModel({ type: Object, default: () => ({}) })

const RESULTS = { pass: '通过', back: '退回补充' }
const resultLabel = computed(() => RESULTS[modelValue.value.tf_roleResult] || modelValue.value.tf_roleResult || '-')

function validate() {
  if (props.view) return null
  if (!modelValue.value.tf_roleResult) return '请选择角色审批结论'
  return null
}
defineExpose({ validate })
</script>
