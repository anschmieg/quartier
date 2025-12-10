<template>
  <codemirror
    v-model="code"
    placeholder="Write your markdown here..."
    :style="{ height: '100%', fontSize: '14px' }"
    :autofocus="true"
    :indent-with-tab="true"
    :tab-size="2"
    :extensions="extensions"
    @change="handleChange"
  />
</template>

<script setup lang="ts">
import { ref, watch, shallowRef } from 'vue'
import { Codemirror } from 'vue-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits(['update:modelValue'])

const code = ref(props.modelValue)
const extensions = shallowRef([markdown(), oneDark])

watch(() => props.modelValue, (newVal) => {
  if (newVal !== code.value) {
    code.value = newVal
  }
})

function handleChange(value: string) {
  emit('update:modelValue', value)
}
</script>
