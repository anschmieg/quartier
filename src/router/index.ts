import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '@/components/landing/LandingPage.vue'
import Dashboard from '@/components/dashboard/Dashboard.vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import { historyService } from '@/services/history'

const routes = [
    {
        path: '/',
        name: 'landing',
        component: LandingPage,
        meta: { public: true },
        beforeEnter: (to: any, _from: any, next: any) => {
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
