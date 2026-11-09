<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header class="site-header">
    <div class="frame header-inner">
      <RouterLink class="brand" :to="{ name: 'home' }" aria-label="必应壁纸档案首页">
        <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true" fill="none">
          <rect width="28" height="28" rx="7" fill="currentColor" />
          <path d="m5 21 6-9 4 5 3-4 5 8H5Z" fill="#edf1df" />
          <circle cx="19" cy="8.5" r="2.5" fill="#edf1df" />
        </svg>
        <span>必应壁纸档案</span>
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
      <a href="https://github.com/Akoasmn/Bing-UPYun">项目源码</a>
    </div>
  </footer>
</template>
