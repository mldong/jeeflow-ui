<template>
  <div v-if="view" class="jf-schema-form">
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">业务类型</label>
      <div class="jf-detail-text">{{ bizTypeLabel }}</div>
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">预算金额（元）</label>
      <div class="jf-detail-text">{{ modelValue.f_budget ?? '-' }}</div>
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">紧急程度</label>
      <div class="jf-detail-text">{{ urgencyLabel }}</div>
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">申请说明</label>
      <div class="jf-detail-text">{{ modelValue.f_desc || '-' }}</div>
    </div>
  </div>
  <div v-else class="jf-schema-form">
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">业务类型 <span class="jf-req">*</span></label>
      <select v-model="modelValue.f_bizType" class="jf-input">
        <option value="">请选择</option>
        <option value="purchase">采购</option>
        <option value="outsource">外包</option>
        <option value="other">其他</option>
      </select>
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">预算金额（元） <span class="jf-req">*</span></label>
      <input v-model.number="modelValue.f_budget" class="jf-input" type="number" min="0" placeholder="元" />
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">紧急程度</label>
      <select v-model="modelValue.f_urgency" class="jf-input">
        <option value="">请选择</option>
        <option value="normal">普通</option>
        <option value="urgent">紧急</option>
        <option value="critical">特急</option>
      </select>
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">申请说明</label>
      <textarea v-model="modelValue.f_desc" class="jf-input" rows="3" placeholder="说明业务背景与诉求" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

defineOptions({ name: 'MixForm' })

const props = defineProps({
  view: { type: Boolean, default: false },
  task: { type: Object, default: null },
})
const modelValue = defineModel({ type: Object, default: () => ({}) })

const BIZ_TYPES = { purchase: '采购', outsource: '外包', other: '其他' }
const URGENCIES = { normal: '普通', urgent: '紧急', critical: '特急' }
const bizTypeLabel = computed(() => BIZ_TYPES[modelValue.value.f_bizType] || modelValue.value.f_bizType || '-')
const urgencyLabel = computed(() => URGENCIES[modelValue.value.f_urgency] || modelValue.value.f_urgency || '-')

function validate() {
  if (props.view) return null
  if (!modelValue.value.f_bizType) return '请选择业务类型'
  if (!Number(modelValue.value.f_budget)) return '请填写预算金额'
  return null
}
defineExpose({ validate })
</script>
