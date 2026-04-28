import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '@/components/landing/LandingPage.vue'
import Dashboard from '@/components/dashboard/Dashboard.vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import OfflineQuartoWriter from '@/components/writer/OfflineQuartoWriter.vue'
import { historyService } from '@/services/history'
import { initializeAuthContext, useAuthContextState } from '@/services/authContext'

const routes = [
    {
        path: '/',
        name: 'landing',
        component: LandingPage,
        meta: { public: true },
        beforeEnter: async (to: any, _from: any, next: any) => {
            await historyService.initialize()
            // If we have history, go to dashboard instead of landing
            // But allow explicit access via query param ?landing=true if needed
            if (historyService.getProjects().length > 0 && !to.query.landing) {
                next('/dashboard')
            } else {
                next()
            }
        }
    },
    {
        path: '/dashboard',
        name: 'dashboard',
        component: Dashboard,
        meta: { public: true }
    },
    {
        path: '/writer',
        name: 'writer',
        component: OfflineQuartoWriter,
        meta: { public: true }
    },
    {
        path: '/app',
        name: 'app',
        component: AppLayout,
        meta: { requiresAuth: true }
    },
    {
        path: '/s/:token',
        name: 'share',
        component: AppLayout,
        meta: { public: true }  // Public to view, auth checked when joining
    },
    // Catch-all redirect to landing
    {
        path: '/:pathMatch(.*)*',
        redirect: '/'
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// Handle return_to redirection after Cloudflare Access login
router.beforeEach((to, _from, next) => {
    Promise.resolve().then(async () => {
        if (to.query.return_to) {
            const returnTo = to.query.return_to as string
            if (returnTo.startsWith('/')) {
                next(returnTo)
                return
            }
        }

        await initializeAuthContext()
        const auth = useAuthContextState()

        if (to.path === '/app' && auth.authMode === 'anonymous') {
            next('/')
            return
        }

        next()
    }).catch((error) => {
        console.error('Router guard failed:', error)
        next()
    })
})

export default router
