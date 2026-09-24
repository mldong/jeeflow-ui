<template>
  <div v-if="view" class="jf-schema-form">
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">部门意见</label>
      <div class="jf-detail-text">{{ agreeLabel }}</div>
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">部门额度（元）</label>
      <div class="jf-detail-text">{{ modelValue.tf_deptQuota ?? '-' }}</div>
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">部门领导意见</label>
      <div class="jf-detail-text">{{ modelValue.tf_deptNote || '-' }}</div>
    </div>
  </div>
  <div v-else class="jf-schema-form">
    <h3 class="jf-section-title">部门领导审批（任务表单）</h3>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">部门意见 <span class="jf-req">*</span></label>
      <select v-model="modelValue.tf_deptAgree" class="jf-input">
        <option value="">请选择</option>
        <option value="yes">同意占用本部门额度</option>
        <option value="no">不同意</option>
      </select>
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">部门额度（元）</label>
      <input v-model.number="modelValue.tf_deptQuota" class="jf-input" type="number" min="0" placeholder="本部门可承担的额度" />
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">部门领导意见</label>
      <textarea v-model="modelValue.tf_deptNote" class="jf-input" rows="2" placeholder="部门视角的意见（可选）" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

defineOptions({ name: 'DeptForm' })

const props = defineProps({
  view: { type: Boolean, default: false },
  task: { type: Object, default: null },
})
const modelValue = defineModel({ type: Object, default: () => ({}) })

const AGREES = { yes: '同意占用本部门额度', no: '不同意' }
const agreeLabel = computed(() => AGREES[modelValue.value.tf_deptAgree] || modelValue.value.tf_deptAgree || '-')

function validate() {
  if (props.view) return null
  if (!modelValue.value.tf_deptAgree) return '请选择部门意见'
  return null
}
defineExpose({ validate })
</script>
