import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '@/components/landing/LandingPage.vue'
import AppLayout from '@/components/layout/AppLayout.vue'

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
