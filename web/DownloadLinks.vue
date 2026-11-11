<script setup>
import { siteUrl } from './catalog.js'

defineProps({ record: { type: Object, required: true } })
</script>

<template>
  <div class="download-links">
    <a class="button button-primary" :href="siteUrl(record.image)" :download="`bing-${record.date}-1920x1080.jpg`">
      <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7">
        <path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      下载 1920×1080
    </a>
    <a class="button button-secondary" :href="record.uhdUrl" target="_blank" rel="noopener noreferrer">
      4K UHD 官方原图 <span aria-hidden="true">↗</span>
    </a>
  </div>
</template>
