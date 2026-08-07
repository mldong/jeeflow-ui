<template>
  <SchemaForm v-model="modelValue" :fieldLabels="labels" />
</template>

<script setup>
import { SchemaForm } from '@mldong/jeeflow-ui'

const modelValue = defineModel({ type: Object, default: () => ({}) })

const labels = {
  f_reason: '报销事由',
  f_amount: '报销金额',
  f_category: '费用类别',
}
</script>
