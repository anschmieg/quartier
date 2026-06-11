import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LandingPage from '@/components/landing/LandingPage.vue'

const initializeAuthContext = vi.fn(async () => {})

vi.mock('virtual:quartier-features', () => ({
  buildFeatures: {
    profile: 'local-writer',
    sourceEditor: true,
    visualEditor: true,
    remoteStorage: false,
    collaboration: false,
  },
}))

vi.mock('@/services/authContext', () => ({
  initializeAuthContext,
  useAuthContextState: () => ({
    authMode: 'anonymous',
  }),
}))

describe('local-only navigation', () => {
  beforeEach(() => {
    initializeAuthContext.mockClear()
  })

  it('opens the offline writer from the landing page', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: LandingPage },
        { path: '/writer', component: { template: '<div>Writer</div>' } },
      ],
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(LandingPage, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.get('button').trigger('click')

    await vi.waitFor(() => {
      expect(router.currentRoute.value.path).toBe('/writer')
    })
  })

  it('describes local capabilities without promising remote services', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: LandingPage }],
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(LandingPage, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.find('main').exists()).toBe(true)
    expect(wrapper.text()).toContain('local-first Quarto editor')
    expect(wrapper.text()).not.toContain('Cloudflare Access')
    expect(wrapper.text()).not.toContain('GitHub Sync')
    expect(wrapper.findAll('h2')).toHaveLength(3)
  })

  it('does not initialize authentication for the public writer route', async () => {
    const { default: router } = await import('@/router')

    await router.push('/writer')
    await router.isReady()

    expect(initializeAuthContext).not.toHaveBeenCalled()
  })
})
