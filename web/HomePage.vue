<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { loadIndex, loadLatest, loadMonth, siteUrl } from './catalog.js'
import DownloadLinks from './DownloadLinks.vue'

const route = useRoute()
const router = useRouter()
const latest = ref(null)
const latestStatus = ref('loading')
const months = ref([])
const indexStatus = ref('loading')
const records = ref([])
const monthStatus = ref('loading')
const pageSize = 9

const month = computed(() => months.value.find(item => item.month === route.query.month)?.month ?? months.value[0]?.month)
const pageCount = computed(() => Math.ceil(records.value.length / pageSize))
const page = computed(() => {
  const requested = Number(route.query.page)
  return Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, pageCount.value || 1) : 1
})
const visibleRecords = computed(() => records.value.slice((page.value - 1) * pageSize, page.value * pageSize))

const historyLocation = (nextMonth, nextPage = 1) => ({
  name: 'home', query: { month: nextMonth, page: nextPage }, hash: '#history',
})

async function refreshLatest() {
  latestStatus.value = 'loading'
  try {
    latest.value = await loadLatest()
    latestStatus.value = 'ready'
  } catch {
    latestStatus.value = 'error'
  }
}

async function refreshIndex() {
  indexStatus.value = 'loading'
  try {
    months.value = await loadIndex()
    indexStatus.value = 'ready'
  } catch {
    indexStatus.value = 'error'
  }
}

const reloadMonth = ref(0)
watch([month, reloadMonth], async ([selected], _, onCleanup) => {
  records.value = []
  if (!selected) return
  monthStatus.value = 'loading'
  let current = true
  onCleanup(() => { current = false })
  try {
    const data = await loadMonth(selected)
    if (!current) return
    records.value = data
    monthStatus.value = 'ready'
  } catch {
    if (current) monthStatus.value = 'error'
  }
}, { immediate: true })

onMounted(async () => {
  document.title = '必应每日壁纸 | Bing Wallpaper'
  await Promise.all([refreshLatest(), refreshIndex()])
  await nextTick()
  if (route.name === 'home' && route.hash === '#history') document.getElementById('history')?.scrollIntoView()
})
</script>

<template>
  <section aria-labelledby="latest-heading">
    <div class="section-kicker"><span></span> 每日壁纸</div>
    <h1 id="latest-heading" class="page-title">最新壁纸</h1>
    <article v-if="latestStatus === 'ready' && latest" class="hero">
      <RouterLink class="hero-media" :to="{ name: 'detail', params: { date: latest.date } }">
        <img :src="siteUrl(latest.image)" :alt="latest.title" width="1920" height="1080" fetchpriority="high">
      </RouterLink>
      <div class="hero-content">
        <time :datetime="latest.date">{{ latest.date }}</time>
        <RouterLink :to="{ name: 'detail', params: { date: latest.date } }" class="hero-title">
          <h2>{{ latest.title }}</h2>
        </RouterLink>
        <p class="muted">{{ latest.copyright }}</p>
        <DownloadLinks :record="latest" />
      </div>
    </article>
    <div v-else-if="latestStatus === 'loading'" class="state-panel" role="status">正在加载最新壁纸…</div>
    <div v-else-if="latestStatus === 'error'" class="state-panel" role="alert">
      最新壁纸加载失败。 <button class="button button-secondary" @click="refreshLatest">重试</button>
    </div>
    <div v-else class="state-panel" role="status">首张壁纸将在采集成功后展示。</div>
  </section>

  <section id="history" class="history" aria-labelledby="history-heading">
    <div class="section-heading">
      <h2 id="history-heading">历史壁纸</h2>
      <label v-if="months.length" class="month-control">
        <span>月份</span>
        <select :value="month" @change="router.push(historyLocation($event.target.value))">
          <option v-for="item in months" :key="item.month" :value="item.month">{{ item.month }}</option>
        </select>
      </label>
    </div>
    <div v-if="indexStatus === 'error'" class="state-panel" role="alert">
      历史列表加载失败。 <button class="button button-secondary" @click="refreshIndex">重试</button>
    </div>
    <div v-else-if="indexStatus === 'loading'" class="state-panel" role="status">正在加载历史归档…</div>
    <div v-else-if="!month" class="state-panel">暂无历史壁纸。</div>
    <div v-else-if="monthStatus === 'error'" class="state-panel" role="alert">
      此月份加载失败。 <button class="button button-secondary" @click="reloadMonth++">重试</button>
    </div>
    <div v-else-if="monthStatus === 'loading'" class="state-panel" role="status">正在加载 {{ month }}…</div>
    <template v-else>
      <p class="archive-count muted">{{ month }} · {{ records.length }} 张壁纸</p>
      <ul class="wallpaper-grid">
        <li v-for="record in visibleRecords" :key="record.date">
          <RouterLink class="wallpaper-card" :to="{ name: 'detail', params: { date: record.date } }">
            <div class="card-image">
              <img :src="siteUrl(record.image)" :alt="record.title" width="1920" height="1080" loading="lazy" decoding="async">
            </div>
            <div class="card-content">
              <time :datetime="record.date">{{ record.date }}</time>
              <h3>{{ record.title }}</h3>
            </div>
          </RouterLink>
        </li>
      </ul>
      <nav v-if="pageCount > 1" class="pagination" aria-label="历史壁纸分页">
        <RouterLink v-if="page > 1" class="button button-secondary" :to="historyLocation(month, page - 1)">上一页</RouterLink>
        <span v-else class="button disabled" aria-disabled="true">上一页</span>
        <span>第 {{ page }} / {{ pageCount }} 页</span>
        <RouterLink v-if="page < pageCount" class="button button-secondary" :to="historyLocation(month, page + 1)">下一页</RouterLink>
        <span v-else class="button disabled" aria-disabled="true">下一页</span>
      </nav>
    </template>
  </section>
</template>
