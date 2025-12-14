import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '@/components/landing/LandingPage.vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import JoinPage from '@/pages/JoinPage.vue'

const routes = [
    {
        path: '/',
        name: 'landing',
        component: LandingPage,
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
        component: JoinPage,
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

export default router
