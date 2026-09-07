<template>
  <!-- 详情查看模式：只读明细（对齐 vben5-wf FormDescription 效果） -->
  <div v-if="view" class="jf-schema-form">
    <div class="jf-form-item">
      <label class="jf-form-label">请假事由</label>
      <div class="jf-detail-text">{{ modelValue.f_reason || '-' }}</div>
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">请假天数</label>
      <div class="jf-detail-text">{{ modelValue.f_days ?? '-' }}</div>
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">请假类型</label>
      <div class="jf-detail-text">{{ leaveTypeLabel }}</div>
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">开始日期</label>
      <div class="jf-detail-text">{{ modelValue.f_startDate || '-' }}</div>
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">结束日期</label>
      <div class="jf-detail-text">{{ modelValue.f_endDate || '-' }}</div>
    </div>
  </div>
  <!-- 发起/发起人重填模式：可编辑表单 -->
  <div v-else class="jf-schema-form">
    <div class="jf-form-item">
      <label class="jf-form-label">请假事由 <span class="jf-req">*</span></label>
      <textarea v-model="modelValue.f_reason" class="jf-input" rows="3" placeholder="请输入请假事由" />
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">请假天数 <span class="jf-req">*</span></label>
      <input v-model.number="modelValue.f_days" class="jf-input" type="number" min="0.5" step="0.5" placeholder="天数" />
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">请假类型</label>
      <select v-model="modelValue.f_leaveType" class="jf-input">
        <option value="">请选择</option>
        <option value="annual">年假</option>
        <option value="personal">事假</option>
        <option value="sick">病假</option>
      </select>
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">开始日期</label>
      <input v-model="modelValue.f_startDate" class="jf-input" type="date" />
    </div>
    <div class="jf-form-item" style="flex:1 1 50%;max-width:50%">
      <label class="jf-form-label">结束日期</label>
      <input v-model="modelValue.f_endDate" class="jf-input" type="date" />
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

const LEAVE_TYPES = { annual: '年假', personal: '事假', sick: '病假' }
const leaveTypeLabel = computed(() => LEAVE_TYPES[modelValue.value.f_leaveType] || modelValue.value.f_leaveType || '-')

function validate() {
  if (!String(modelValue.value.f_reason ?? '').trim()) return '请填写请假事由'
  const days = Number(modelValue.value.f_days)
  if (!days || days <= 0) return '请填写请假天数'
  return null
}
defineExpose({ validate })
</script>
