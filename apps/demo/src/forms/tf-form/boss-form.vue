<template>
  <div v-if="view" class="jf-schema-form">
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">终审结论</label>
      <div class="jf-detail-text">{{ decisionLabel }}</div>
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">核定金额（元）</label>
      <div class="jf-detail-text">{{ modelValue.tf_finalAmount ?? '-' }}</div>
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">终审意见</label>
      <div class="jf-detail-text">{{ modelValue.tf_bossNote || '-' }}</div>
    </div>
  </div>
  <div v-else class="jf-schema-form">
    <h3 class="jf-section-title">终审意见（任务表单）</h3>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">终审结论 <span class="jf-req">*</span></label>
      <select v-model="modelValue.tf_finalDecision" class="jf-input">
        <option value="">请选择</option>
        <option value="agree">同意</option>
        <option value="conditional">有条件同意</option>
        <option value="reject">驳回</option>
      </select>
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">核定金额（元）</label>
      <input v-model.number="modelValue.tf_finalAmount" class="jf-input" type="number" min="0" placeholder="可在申请金额上调整" />
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">终审意见</label>
      <textarea v-model="modelValue.tf_bossNote" class="jf-input" rows="2" placeholder="终审结论说明（可选）" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

defineOptions({ name: 'BossForm' })

const props = defineProps({
  view: { type: Boolean, default: false },
  task: { type: Object, default: null },
})
const modelValue = defineModel({ type: Object, default: () => ({}) })

const DECISIONS = { agree: '同意', conditional: '有条件同意', reject: '驳回' }
const decisionLabel = computed(() => DECISIONS[modelValue.value.tf_finalDecision] || modelValue.value.tf_finalDecision || '-')

function validate() {
  if (props.view) return null
  if (!modelValue.value.tf_finalDecision) return '请选择终审结论'
  return null
}
defineExpose({ validate })
</script>
