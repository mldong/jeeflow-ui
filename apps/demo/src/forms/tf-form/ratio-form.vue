<template>
  <div v-if="view" class="jf-schema-form">
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">表决</label>
      <div class="jf-detail-text">{{ voteLabel }}</div>
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">表决说明</label>
      <div class="jf-detail-text">{{ modelValue.tf_ratioOpinion || '-' }}</div>
    </div>
  </div>
  <div v-else class="jf-schema-form">
    <h3 class="jf-section-title">比例会签表决（任务表单）</h3>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">表决 <span class="jf-req">*</span></label>
      <select v-model="modelValue.tf_ratioVote" class="jf-input">
        <option value="">请选择</option>
        <option value="agree">同意</option>
        <option value="disagree">不同意</option>
      </select>
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">表决说明</label>
      <textarea v-model="modelValue.tf_ratioOpinion" class="jf-input" rows="2" placeholder="达到设定比例即流转，未达比例继续等待" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

defineOptions({ name: 'RatioForm' })

const props = defineProps({
  view: { type: Boolean, default: false },
  task: { type: Object, default: null },
})
const modelValue = defineModel({ type: Object, default: () => ({}) })

const VOTES = { agree: '同意', disagree: '不同意' }
const voteLabel = computed(() => VOTES[modelValue.value.tf_ratioVote] || modelValue.value.tf_ratioVote || '-')

function validate() {
  if (props.view) return null
  if (!modelValue.value.tf_ratioVote) return '请选择表决结果'
  return null
}
defineExpose({ validate })
</script>
