<template>
  <div v-if="view" class="jf-schema-form">
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">本会签人意见</label>
      <div class="jf-detail-text">{{ voteLabel }}</div>
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">本会签人额度（元）</label>
      <div class="jf-detail-text">{{ modelValue.tf_signAmount ?? '-' }}</div>
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">会签说明</label>
      <div class="jf-detail-text">{{ modelValue.tf_signOpinion || '-' }}</div>
    </div>
  </div>
  <div v-else class="jf-schema-form">
    <h3 class="jf-section-title">会签意见（任务表单）</h3>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">本会签人意见 <span class="jf-req">*</span></label>
      <select v-model="modelValue.tf_signVote" class="jf-input">
        <option value="">请选择</option>
        <option value="support">支持</option>
        <option value="abstain">弃权</option>
        <option value="oppose">反对</option>
      </select>
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">本会签人额度（元）</label>
      <input v-model.number="modelValue.tf_signAmount" class="jf-input" type="number" min="0" placeholder="本人可承担的额度" />
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">会签说明</label>
      <textarea v-model="modelValue.tf_signOpinion" class="jf-input" rows="2" placeholder="并行会签各表己见，互不覆盖" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

defineOptions({ name: 'CountersignForm' })

const props = defineProps({
  view: { type: Boolean, default: false },
  task: { type: Object, default: null },
})
const modelValue = defineModel({ type: Object, default: () => ({}) })

const VOTES = { support: '支持', abstain: '弃权', oppose: '反对' }
const voteLabel = computed(() => VOTES[modelValue.value.tf_signVote] || modelValue.value.tf_signVote || '-')

function validate() {
  if (props.view) return null
  if (!modelValue.value.tf_signVote) return '请选择本会签人意见'
  return null
}
defineExpose({ validate })
</script>
