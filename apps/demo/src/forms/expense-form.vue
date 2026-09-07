<template>
  <!-- 详情查看模式：只读明细（对齐 vben5-wf FormDescription 效果） -->
  <div v-if="view" class="jf-schema-form">
    <div class="jf-form-item">
      <label class="jf-form-label">报销事由</label>
      <div class="jf-detail-text">{{ modelValue.f_reason || '-' }}</div>
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">报销金额</label>
      <div class="jf-detail-text">{{ modelValue.f_amount ?? '-' }}</div>
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">费用类别</label>
      <div class="jf-detail-text">{{ categoryLabel }}</div>
    </div>
  </div>
  <!-- 发起/发起人重填模式：可编辑表单 -->
  <div v-else class="jf-schema-form">
    <div class="jf-form-item">
      <label class="jf-form-label">报销事由 <span class="jf-req">*</span></label>
      <textarea v-model="modelValue.f_reason" class="jf-input" rows="3" placeholder="请输入报销事由" />
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">报销金额 <span class="jf-req">*</span></label>
      <input v-model.number="modelValue.f_amount" class="jf-input" type="number" min="0" step="0.01" placeholder="金额" />
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">费用类别</label>
      <select v-model="modelValue.f_category" class="jf-input">
        <option value="">请选择</option>
        <option value="travel">差旅</option>
        <option value="meal">餐饮</option>
        <option value="office">办公</option>
        <option value="other">其他</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 详情查看：true 只读明细 / false 可编辑（发起人重新提交）
  view: { type: Boolean, default: false },
})
const modelValue = defineModel({ type: Object, default: () => ({}) })

const CATEGORIES = { travel: '差旅', meal: '餐饮', office: '办公', other: '其他' }
const categoryLabel = computed(() => CATEGORIES[modelValue.value.f_category] || modelValue.value.f_category || '-')

function validate() {
  if (!String(modelValue.value.f_reason ?? '').trim()) return '请填写报销事由'
  const amount = Number(modelValue.value.f_amount)
  if (!amount || amount <= 0) return '请填写报销金额'
  return null
}
defineExpose({ validate })
</script>
