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
import { autocompletion, type CompletionContext } from '@codemirror/autocomplete'
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
import { languageService } from '@/core/language/CompositeLanguageService'
import type { DocumentRef, WorkspaceHandle } from '@/core/workspace/types'

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
    autocompletion({
      override: [quartoCompletionSource],
    }),
    oneDark
  ]
})

async function quartoCompletionSource(context: CompletionContext) {
  const filename = props.filename || 'document.qmd'
  const extension = filename.split('.').pop()?.toLowerCase() || 'qmd'
  const isQuarto = ['qmd', 'rmd', 'md', 'markdown'].includes(extension)
  if (!isQuarto) return null

  const word = context.matchBefore(/[@#|\w-]*/)
  if (!word || (word.from === word.to && !context.explicit)) return null

  const line = context.state.doc.lineAt(context.pos)
  const workspace: WorkspaceHandle = {
    providerId: 'local',
    workspaceId: 'browser:offline-writer',
    displayName: 'Offline Writer',
  }
  const document: DocumentRef = {
    workspaceId: workspace.workspaceId,
    path: filename,
    kind: 'text',
    language: extension,
    isQuarto,
  }
  const completions = await languageService.getCompletions(
    { line: line.number, column: context.pos - line.from + 1 },
    document,
    workspace,
    context.state.doc.toString(),
  )

  return {
    from: word.from,
    options: completions.map((completion) => ({
      label: completion.label,
      detail: completion.detail,
      apply: completion.insertText || completion.label,
      type: completion.label.startsWith('code-cell') || completion.label.startsWith('callout') ? 'snippet' : 'property',
    })),
  }
}

watch(() => props.modelValue, (newVal) => {
  if (newVal !== code.value) {
    code.value = newVal
  }
})

function handleChange(value: string) {
  emit('update:modelValue', value)
}
</script>
