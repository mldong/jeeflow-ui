<template>
  <div class="jf-schema-form">
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
const modelValue = defineModel({ type: Object, default: () => ({}) })
</script>
