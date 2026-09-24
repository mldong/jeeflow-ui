<template>
  <!-- 只读明细（详情/办理上方回显用） -->
  <div v-if="view" class="jf-schema-form">
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">核准天数</label>
      <div class="jf-detail-text">{{ modelValue.tf_approvedDays ?? '-' }}</div>
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">需补材料</label>
      <div class="jf-detail-text">{{ needExtraLabel }}</div>
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">核准说明</label>
      <div class="jf-detail-text">{{ modelValue.tf_remark || '-' }}</div>
    </div>
  </div>
  <!-- 办理填写（审批人视角） -->
  <div v-else class="jf-schema-form">
    <h3 class="jf-section-title">核准意见（任务表单）</h3>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">核准天数 <span class="jf-req">*</span></label>
      <input v-model.number="modelValue.tf_approvedDays" class="jf-input" type="number" min="0" step="0.5" placeholder="实际核准的天数" />
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">需补材料</label>
      <select v-model="modelValue.tf_needExtra" class="jf-input">
        <option value="">请选择</option>
        <option value="no">不需要</option>
        <option value="yes">需要</option>
      </select>
    </div>
    <div class="jf-form-item">
      <label class="jf-form-label">核准说明</label>
      <textarea v-model="modelValue.tf_remark" class="jf-input" rows="2" placeholder="补充审批结论（可选，与下方审批意见分开存）" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

defineOptions({ name: 'LeaveForm' })

const props = defineProps({
  /** true=只读明细（详情 / 办理上方申请信息）；false=办理时填写 */
  view: { type: Boolean, default: false },
  /** 办理抽屉传入的 TaskRow，只读明细用不到，留作扩展 */
  task: { type: Object, default: null },
})

// 字段名一律带 tf_ 前缀：办理提交时 collectTf 不再二次加前缀，
// 重开抽屉时引擎回的 taskFormData 也是 tf_ 前缀，两边对得上才能回显
const modelValue = defineModel({ type: Object, default: () => ({}) })

const NEED_EXTRA = { yes: '需要', no: '不需要' }
const needExtraLabel = computed(() => {
  const v = modelValue.value.tf_needExtra
  return NEED_EXTRA[v] || v || '-'
})

function validate() {
  const days = Number(modelValue.value.tf_approvedDays)
  if (props.view) return null
  if (!days || days <= 0) return '请填写核准天数'
  return null
}
defineExpose({ validate })
</script>
