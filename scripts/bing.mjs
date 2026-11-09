import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { atomicWrite, bingImageUrl, bingOrigin, imagePath, isWallpaperDate, readMonths,
  verifyArchive, writeIndexes, writeMonth } from './archive.mjs'

const endpoint = `${bingOrigin}/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN`
const shanghaiDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', dateStyle: 'short' })

function wallpaperDate(image) {
  // fullstartdate is the start instant in UTC. The Chinese market switches at midnight in Shanghai.
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(image.fullstartdate)
  if (!match) throw new Error('必应响应缺少有效的 fullstartdate')
  const [, year, month, day, hour, minute] = match
  const utcDate = `${year}-${month}-${day}`
  const instant = new Date(`${utcDate}T${hour}:${minute}:00Z`)
  if (!isWallpaperDate(utcDate) || Number(hour) > 23 || !Number.isFinite(instant.getTime())) {
    throw new Error('必应响应的壁纸发布时间无效')
  }
  return shanghaiDate.format(instant)
}

function parseBingRecord(image) {
  if (!image || typeof image.urlbase !== 'string' || typeof image.copyright !== 'string' || !image.copyright.trim()) {
    throw new Error('必应响应缺少图片信息')
  }
  if (image.wp === false) throw new Error('该图片未由必应提供为可下载壁纸')
  const base = new URL(image.urlbase, bingOrigin)
  if (base.origin !== bingOrigin || base.pathname !== '/th') throw new Error('必应图片地址格式无效')
  const bingId = base.searchParams.get('id')
  const date = wallpaperDate(image)
  return {
    date,
    title: (typeof image.title === 'string' && image.title.trim()) || image.copyright.trim(),
    copyright: image.copyright.trim(),
    bingId,
    image: imagePath(date),
    uhdUrl: bingImageUrl(bingId, 'UHD'),
  }
}

export function isHdJpeg(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 ||
      bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) return false
  // Read the JPEG frame header without decoding or re-encoding the image.
  const frameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf])
  let offset = 2
  while (offset < bytes.length && bytes[offset] === 0xff) {
    while (bytes[offset] === 0xff) offset++
    const marker = bytes[offset++]
    if (marker === 0xda || marker === 0xd9 || offset + 2 > bytes.length) return false
    const length = bytes.readUInt16BE(offset)
    if (length < 2 || offset + length > bytes.length) return false
    if (frameMarkers.has(marker)) {
      return length >= 8 && bytes.readUInt16BE(offset + 3) === 1080 && bytes.readUInt16BE(offset + 5) === 1920
    }
    offset += length
  }
  return false
}

async function request(url, fetcher) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(30_000), redirect: 'error' })
  if (!response.ok) throw new Error(`必应请求失败（HTTP ${response.status}）`)
  return response
}

export async function collectWallpaper(root, fetcher = fetch) {
  const months = await readMonths(root)
  const response = await request(endpoint, fetcher)
  const data = await response.json()
  const record = parseBingRecord(data.images?.[0])
  const month = record.date.slice(0, 7)
  const records = months.get(month) ?? []
  const previous = records.find(item => item.date === record.date)
  const destination = join(root, record.image)

  if (previous) {
    const saved = await readFile(destination).catch(error => {
      if (error.code !== 'ENOENT') throw error
      return null
    })
    if (saved && saved.length === previous.bytes && isHdJpeg(saved)) {
      await verifyArchive(root, months)
      await writeIndexes(root, months)
      return { date: record.date, status: 'unchanged' }
    }
    if (previous.bingId !== record.bingId) throw new Error(`无法从当前响应修复 ${record.date} 的旧图片`)
  } else if (months.size && record.date < months.values().next().value[0].date) {
    // A delayed upstream response should never add records from before this archive's current head.
    await verifyArchive(root, months)
    await writeIndexes(root, months)
    return { date: record.date, status: 'stale' }
  }

  const image = await request(bingImageUrl(record.bingId, '1920x1080'), fetcher)
  const bytes = Buffer.from(await image.arrayBuffer())
  if (!isHdJpeg(bytes)) throw new Error('下载内容不是有效的 1920×1080 JPEG')

  record.bytes = bytes.length
  record.collectedAt = new Date().toISOString()
  const updated = [...records.filter(item => item.date !== record.date), record]
    .sort((a, b) => b.date.localeCompare(a.date))
  await atomicWrite(destination, bytes)
  await writeMonth(root, month, updated)
  months.set(month, updated)
  await verifyArchive(root, months)
  await writeIndexes(root, months)
  return { date: record.date, status: previous ? 'repaired' : 'added' }
}
