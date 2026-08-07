<template>
  <!-- 业务表单注册样板（宿主照抄）：包装 SchemaForm + 字段标签 -->
  <SchemaForm v-model="modelValue" :fieldLabels="labels" />
</template>

<script setup>
import { SchemaForm } from '@mldong/jeeflow-ui'

const modelValue = defineModel({ type: Object, default: () => ({}) })

const labels = {
  f_reason: '事由',
  f_amount: '申请金额',
}
</script>
