<template>
  <div v-if="view" class="jf-schema-form">
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">风险等级</label>
      <div class="jf-detail-text">{{ riskLabel }}</div>
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">需法务补件</label>
      <div class="jf-detail-text">{{ needDocLabel }}</div>
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">审核意见</label>
      <div class="jf-detail-text">{{ modelValue.tf_reviewOpinion || '-' }}</div>
    </div>
  </div>
  <div v-else class="jf-schema-form">
    <h3 class="jf-section-title">审核意见（任务表单）</h3>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">风险等级 <span class="jf-req">*</span></label>
      <select v-model="modelValue.tf_riskLevel" class="jf-input">
        <option value="">请选择</option>
        <option value="low">低</option>
        <option value="mid">中</option>
        <option value="high">高</option>
      </select>
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">需法务补件</label>
      <select v-model="modelValue.tf_needLegalDoc" class="jf-input">
        <option value="">请选择</option>
        <option value="no">不需要</option>
        <option value="yes">需要</option>
      </select>
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">审核意见</label>
      <textarea v-model="modelValue.tf_reviewOpinion" class="jf-input" rows="2" placeholder="合规/法务角度的意见" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

defineOptions({ name: 'ReviewForm' })

const props = defineProps({
  view: { type: Boolean, default: false },
  task: { type: Object, default: null },
})
// 字段带 tf_ 前缀：提交时不被二次加前缀，重开时与引擎回的 taskFormData 对得上
const modelValue = defineModel({ type: Object, default: () => ({}) })

const RISKS = { low: '低', mid: '中', high: '高' }
const YES_NO = { yes: '需要', no: '不需要' }
const riskLabel = computed(() => RISKS[modelValue.value.tf_riskLevel] || modelValue.value.tf_riskLevel || '-')
const needDocLabel = computed(() => YES_NO[modelValue.value.tf_needLegalDoc] || modelValue.value.tf_needLegalDoc || '-')

function validate() {
  if (props.view) return null
  if (!modelValue.value.tf_riskLevel) return '请选择风险等级'
  return null
}
defineExpose({ validate })
</script>
