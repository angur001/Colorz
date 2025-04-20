import { createRouter, createWebHistory } from 'vue-router'
import Home from '../components/Home.vue'
import WaitingRoom from '../components/WaitingRoom.vue'
import ColorGame from '../components/ColorGame.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/waiting/:id',
      name: 'waiting',
      component: WaitingRoom
    },
    {
      path: '/game/:id',
      name: 'game',
      component: ColorGame
    }
  ]
})

export default router