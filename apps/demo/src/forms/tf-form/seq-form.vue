<template>
  <div v-if="view" class="jf-schema-form">
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">本轮环节</label>
      <div class="jf-detail-text">{{ stageLabel }}</div>
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">串行结论</label>
      <div class="jf-detail-text">{{ voteLabel }}</div>
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">串行会签意见</label>
      <div class="jf-detail-text">{{ modelValue.tf_seqOpinion || '-' }}</div>
    </div>
  </div>
  <div v-else class="jf-schema-form">
    <h3 class="jf-section-title">串行会签（任务表单）</h3>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">本轮环节</label>
      <select v-model="modelValue.tf_seqStage" class="jf-input">
        <option value="">请选择</option>
        <option value="first">初审</option>
        <option value="second">复审</option>
        <option value="third">终审确认</option>
      </select>
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">串行结论 <span class="jf-req">*</span></label>
      <select v-model="modelValue.tf_seqVote" class="jf-input">
        <option value="">请选择</option>
        <option value="pass">通过，转下一人</option>
        <option value="hold">暂缓</option>
      </select>
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">串行会签意见</label>
      <textarea v-model="modelValue.tf_seqOpinion" class="jf-input" rows="2" placeholder="按顺序逐人填写，后一轮可见前一轮结论" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

defineOptions({ name: 'SeqForm' })

const props = defineProps({
  view: { type: Boolean, default: false },
  task: { type: Object, default: null },
})
const modelValue = defineModel({ type: Object, default: () => ({}) })

const STAGES = { first: '初审', second: '复审', third: '终审确认' }
const VOTES = { pass: '通过，转下一人', hold: '暂缓' }
const stageLabel = computed(() => STAGES[modelValue.value.tf_seqStage] || modelValue.value.tf_seqStage || '-')
const voteLabel = computed(() => VOTES[modelValue.value.tf_seqVote] || modelValue.value.tf_seqVote || '-')

function validate() {
  if (props.view) return null
  if (!modelValue.value.tf_seqVote) return '请选择串行结论'
  return null
}
defineExpose({ validate })
</script>
