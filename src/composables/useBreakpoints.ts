import { ref, computed, onMounted, onUnmounted } from 'vue'

export type SidebarMode = 'persistent' | 'temporary' | 'overlay'

const BREAKPOINT_LARGE = 1024
const BREAKPOINT_MEDIUM = 768

/**
 * Provides reactive screen size detection for responsive layouts.
 * 
 * Breakpoints:
 * - Large (≥1024px): Sidebar is persistent, pushes content
 * - Medium (768-1023px): Sidebar is temporary, auto-closes on click-outside
 * - Small (<768px): Sidebar is overlay, floats over content with backdrop
 */
export function useBreakpoints() {
  const width = ref(typeof window !== 'undefined' ? window.innerWidth : BREAKPOINT_LARGE)

  const isLarge = computed(() => width.value >= BREAKPOINT_LARGE)
  const isMedium = computed(() => width.value >= BREAKPOINT_MEDIUM && width.value < BREAKPOINT_LARGE)
  const isSmall = computed(() => width.value < BREAKPOINT_MEDIUM)

  const sidebarMode = computed<SidebarMode>(() => {
    if (isLarge.value) return 'persistent'
    if (isMedium.value) return 'temporary'
    return 'overlay'
  })

  let resizeObserver: ResizeObserver | null = null

  onMounted(() => {
    if (typeof window === 'undefined') return

    // Use ResizeObserver for efficient resize detection
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => {
        width.value = window.innerWidth
      })
      resizeObserver.observe(document.body)
    } else {
      // Fallback for older browsers
      const handleResize = () => {
        width.value = window.innerWidth
      }
      ;(window as Window).addEventListener('resize', handleResize)
    }
  })

  onUnmounted(() => {
    resizeObserver?.disconnect()
  })

  return {
    width,
    isLarge,
    isMedium,
    isSmall,
    sidebarMode,
    BREAKPOINT_LARGE,
    BREAKPOINT_MEDIUM
  }
}
