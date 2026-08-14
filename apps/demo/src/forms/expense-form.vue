<template>
  <div class="jf-schema-form">
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
const modelValue = defineModel({ type: Object, default: () => ({}) })
</script>
