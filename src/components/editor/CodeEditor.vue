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
import { ref, watch, computed } from 'vue'
import { StreamLanguage } from '@codemirror/language'
import { languages } from '@codemirror/language-data'
import { python } from '@codemirror/lang-python'
import { javascript } from '@codemirror/lang-javascript'
import { markdown } from '@codemirror/lang-markdown'
import { json } from '@codemirror/lang-json'
import { yaml } from '@codemirror/lang-yaml'
import { r } from '@codemirror/legacy-modes/mode/r'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { toml } from '@codemirror/legacy-modes/mode/toml'
import { oneDark } from '@codemirror/theme-one-dark'
import { Codemirror } from 'vue-codemirror'

const props = defineProps<{
  modelValue: string
  filename?: string
}>()

const emit = defineEmits(['update:modelValue'])

const code = ref(props.modelValue)

const getLanguageExtension = (filename?: string) => {
  if (!filename) return markdown()
  
  const ext = filename.split('.').pop()?.toLowerCase()
  
  switch (ext) {
    case 'py':
    case 'python':
      return python()
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'mjs':
    case 'cjs':
      return javascript() // handles ts/jsx automatically
    case 'r':
      return StreamLanguage.define(r)
    case 'sh':
    case 'bash':
    case 'zsh':
    case 'fish':
      return StreamLanguage.define(shell)
    case 'json':
    case 'ipynb':
      return json()
    case 'yaml':
    case 'yml':
      return yaml()
    case 'toml':
      return StreamLanguage.define(toml)
    case 'md':
    case 'qmd':
    case 'rmd':
    case 'mkd':
    case 'markdown':
    default:
      // Pass codeLanguages to enabling highlighting inside markdown code blocks
      return markdown({ codeLanguages: languages })
  }
}

const extensions = computed(() => {
  return [
    getLanguageExtension(props.filename),
    oneDark
  ]
})

watch(() => props.modelValue, (newVal) => {
  if (newVal !== code.value) {
    code.value = newVal
  }
})

function handleChange(value: string) {
  emit('update:modelValue', value)
}
</script>
