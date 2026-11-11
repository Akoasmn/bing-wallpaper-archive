<script setup>
import { RouterLink, RouterView } from 'vue-router'
import brandIcon from './assets/brand.svg'
</script>

<template>
  <header class="site-header">
    <div class="frame header-inner">
      <RouterLink class="brand" :to="{ name: 'home' }" aria-label="必应每日壁纸首页">
        <img :src="brandIcon" width="28" height="28" alt="">
        <span>必应每日壁纸</span>
      </RouterLink>
      <nav aria-label="主导航">
        <RouterLink :to="{ name: 'home' }">首页</RouterLink>
        <RouterLink :to="{ name: 'home', hash: '#history' }">历史壁纸</RouterLink>
      </nav>
    </div>
  </header>
  <main class="frame main-content">
    <RouterView />
  </main>
  <footer class="site-footer">
    <div class="frame footer-inner">
      <span>壁纸来自 Microsoft Bing，版权归原作者所有。</span>
      <a href="https://github.com/Akoasmn/bing-wallpaper-archive">项目源码</a>
    </div>
  </footer>
</template>
