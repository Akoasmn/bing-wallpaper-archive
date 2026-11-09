<script setup>
import { ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { loadIndex, loadMonth, siteUrl } from './catalog.js'
import DownloadLinks from './DownloadLinks.vue'

const props = defineProps({ date: { type: String, default: '' } })
const record = ref(null)
const status = ref('loading')
const reload = ref(0)

watch([() => props.date, reload], async ([date], _, onCleanup) => {
  document.title = '壁纸详情 · 必应壁纸档案'
  record.value = null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    status.value = 'missing'
    return
  }
  status.value = 'loading'
  let current = true
  onCleanup(() => { current = false })
  try {
    const month = date.slice(0, 7)
    const index = await loadIndex()
    const entries = index.some(item => item.month === month) ? await loadMonth(month) : []
    if (!current) return
    record.value = entries.find(item => item.date === date) ?? null
    status.value = record.value ? 'ready' : 'missing'
    if (record.value) document.title = `${record.value.title} · 必应壁纸档案`
  } catch {
    if (current) status.value = 'error'
  }
}, { immediate: true })
</script>

<template>
  <RouterLink class="back-link" :to="{ name: 'home', query: record ? { month: record.date.slice(0, 7) } : {}, hash: '#history' }">
    <span aria-hidden="true">←</span> 返回历史壁纸
  </RouterLink>
  <article v-if="status === 'ready'" class="wallpaper-detail">
    <div class="section-kicker"><span></span><time :datetime="record.date">{{ record.date }}</time></div>
    <h1 class="page-title">{{ record.title }}</h1>
    <p class="muted">{{ record.copyright }}</p>
    <div class="detail-image">
      <img :src="siteUrl(record.image)" :alt="record.title" width="1920" height="1080" fetchpriority="high">
    </div>
    <DownloadLinks :record="record" />
  </article>
  <div v-else-if="status === 'loading'" class="state-panel" role="status">正在加载壁纸…</div>
  <div v-else-if="status === 'error'" class="state-panel" role="alert">
    壁纸详情加载失败。 <button class="button button-secondary" @click="reload++">重试</button>
  </div>
  <div v-else class="state-panel">
    <h1>{{ date ? '这一天没有归档壁纸' : '页面不存在' }}</h1>
    <p v-if="date">{{ date }}</p>
  </div>
</template>
