import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import DetailPage from './DetailPage.vue'
import HomePage from './HomePage.vue'
import './style.css'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomePage },
    { path: '/detail/:date', name: 'detail', component: DetailPage, props: true },
    { path: '/:pathMatch(.*)*', component: DetailPage },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.path !== from.path) return { top: 0 }
    if (to.hash) return { el: to.hash }
  },
})

createApp(App).use(router).mount('#app')
