import { createRouter, createWebHistory } from 'vue-router'
import LocalMvpEditor from '@/components/mvp/LocalMvpEditor.vue'

const LandingPage = () => import('@/components/landing/LandingPage.vue')
const Dashboard = () => import('@/components/dashboard/Dashboard.vue')
const AppLayout = () => import('@/components/layout/AppLayout.vue')

const routes = [
    {
        path: '/',
        name: 'local-editor',
        component: LocalMvpEditor,
        meta: { public: true }
    },
    {
        path: '/welcome',
        name: 'landing',
        component: LandingPage,
        meta: { public: true }
    },
    {
        path: '/dashboard',
        name: 'dashboard',
        component: Dashboard,
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
    if (to.query.return_to) {
        const returnTo = to.query.return_to as string
        // Validate it's a relative path to prevent open redirect
        if (returnTo.startsWith('/')) {
            // Remove the param to clean up URL and redirect
            const nextPath = returnTo
            // Delete the query param from current navigation
            delete to.query.return_to
            next(nextPath)
            return
        }
    }
    next()
})

export default router
