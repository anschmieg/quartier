<template>
  <div class="user-menu">
    <!-- Loading state -->
    <div v-if="isLoading" class="flex items-center gap-2">
      <div class="w-8 h-8 rounded-full bg-muted animate-pulse" />
      <div class="text-sm">
        <div class="h-4 w-20 bg-muted rounded animate-pulse" />
      </div>
    </div>

    <!-- Authenticated user -->
    <DropdownMenu v-else-if="isAuthenticated && user">
      <DropdownMenuTrigger as-child>
        <button class="flex items-center gap-2 p-1 rounded hover:bg-muted transition-colors">
          <img 
            v-if="user.avatar_url" 
            :src="user.avatar_url" 
            :alt="user.login"
            class="w-8 h-8 rounded-full"
          />
          <div v-else class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
            {{ user.login.charAt(0).toUpperCase() }}
          </div>
          <div class="text-sm text-left">
            <div class="font-medium">{{ user.name || user.login }}</div>
            <div class="text-xs text-muted-foreground">Host</div>
          </div>
          <ChevronDown class="w-4 h-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-48">
        <DropdownMenuLabel>
          <div class="flex items-center gap-2">
            <Github class="w-4 h-4" />
            {{ user.login }}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem @select="emit('open-shared', 'shared-with-me')">
          <FolderDown class="w-4 h-4 mr-2" />
          Shared with me
        </DropdownMenuItem>
        <DropdownMenuItem @select="emit('open-shared', 'shared-by-me')">
          <FolderUp class="w-4 h-4 mr-2" />
          Shared by me
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem @select="logout" class="text-destructive">
          <LogOut class="w-4 h-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <!-- Cloudflare Access Authenticated (Guest) -->
    <div v-else-if="isAccessAuthenticated" class="flex items-center gap-2">
      <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-xs">
        {{ accessUser?.email?.charAt(0).toUpperCase() }}
      </div>
      <div class="text-sm">
        <div class="font-medium truncate max-w-[120px]" :title="accessUser?.email">{{ accessUser?.email }}</div>
        <div class="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 w-fit">
          Guest
        </div>
        <button 
          @click="login()" 
          class="text-xs text-primary hover:underline"
        >
          Link GitHub Account
        </button>
      </div>
    </div>

    <!-- Unauthenticated Guest -->
    <div v-else class="flex items-center gap-2">
      <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
        <User class="w-4 h-4 text-slate-500" />
      </div>
      <div class="text-sm">
        <div class="font-medium">Guest</div>
        <button 
          @click="login()" 
          class="text-xs text-primary hover:underline"
        >
          Sign in with GitHub
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { User, ChevronDown, LogOut, Github, FolderDown, FolderUp } from 'lucide-vue-next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/composables/useAuth'

const { user, accessUser, isLoading, isAuthenticated, isAccessAuthenticated, login, logout } = useAuth()

const emit = defineEmits<{
  'open-shared': [mode: 'shared-with-me' | 'shared-by-me']
}>()
</script>
