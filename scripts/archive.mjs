import { randomUUID } from 'node:crypto'
import { lstat, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/
const imageIdPattern = /^OHR\.[a-z\d_.-]+$/i
export const schemaVersion = 1
export const bingOrigin = 'https://cn.bing.com'
export const archiveRoot = resolve(process.env.ARCHIVE_DIR || '.archive')

export function isWallpaperDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function imagePath(date) {
  return `images/${date.slice(0, 7)}/${date}/1920x1080.jpg`
}

export function bingImageUrl(id, resolution) {
  if (!imageIdPattern.test(id)) throw new Error('无效的必应图片标识')
  return new URL(`/th?id=${id}_${resolution}.jpg`, bingOrigin).href
}

export async function atomicWrite(path, data) {
  const temporary = `${path}.${randomUUID()}.tmp`
  await mkdir(dirname(path), { recursive: true })
  try {
    await writeFile(temporary, data, { flag: 'wx' })
    await rename(temporary, path)
  } finally {
    await rm(temporary, { force: true })
  }
}

async function writeJson(path, data) {
  const content = `${JSON.stringify(data, null, 2)}\n`
  const previous = await readFile(path, 'utf8').catch(error => {
    if (error.code !== 'ENOENT') throw error
    return null
  })
  if (content !== previous) await atomicWrite(path, content)
}

function validateRecord(record, month, seen) {
  if (!record || !isWallpaperDate(record.date) || record.date.slice(0, 7) !== month ||
      seen.has(record.date) || record.image !== imagePath(record.date) ||
      typeof record.bingId !== 'string' || !imageIdPattern.test(record.bingId) ||
      record.uhdUrl !== bingImageUrl(record.bingId, 'UHD') ||
      typeof record.title !== 'string' || !record.title.trim() ||
      typeof record.copyright !== 'string' || !record.copyright.trim() ||
      typeof record.collectedAt !== 'string' || !Number.isFinite(Date.parse(record.collectedAt)) ||
      !Number.isSafeInteger(record.bytes) || record.bytes < 1) {
    throw new Error(`归档记录无效：${month} / ${record?.date ?? '无日期'}`)
  }
  seen.add(record.date)
}

export async function readMonths(root) {
  const directory = join(root, 'metadata', 'months')
  const files = await readdir(directory).catch(error => {
    if (error.code !== 'ENOENT') throw error
    return []
  })
  const months = new Map()
  for (const file of files.sort().reverse()) {
    const month = file.slice(0, -5)
    if (!file.endsWith('.json') || !monthPattern.test(month)) continue
    const data = JSON.parse(await readFile(join(directory, file), 'utf8'))
    if (data?.schemaVersion !== schemaVersion || !Array.isArray(data.records) || !data.records.length) {
      throw new Error(`月份 JSON 无效：${file}`)
    }
    const seen = new Set()
    for (const record of data.records) validateRecord(record, month, seen)
    months.set(month, data.records.sort((a, b) => b.date.localeCompare(a.date)))
  }
  return months
}

export async function writeMonth(root, month, records) {
  const seen = new Set()
  for (const record of records) validateRecord(record, month, seen)
  await writeJson(join(root, 'metadata', 'months', `${month}.json`), { schemaVersion, records })
}

export async function writeIndexes(root, months) {
  const keys = [...months.keys()].sort().reverse()
  await writeJson(join(root, 'metadata', 'index.json'), {
    schemaVersion,
    months: keys.map(month => ({ month, count: months.get(month).length })),
  })
  await writeJson(join(root, 'metadata', 'latest.json'), {
    schemaVersion,
    record: keys.length ? months.get(keys[0])[0] : null,
  })
}

export async function verifyArchive(root, months) {
  for (const records of months.values()) {
    for (const record of records) {
      const file = await lstat(join(root, record.image)).catch(error => {
        if (error.code !== 'ENOENT') throw error
        throw new Error(`归档图片缺失：${record.image}`)
      })
      if (!file.isFile() || file.size !== record.bytes) {
        throw new Error(`归档图片与记录不一致：${record.image}`)
      }
    }
  }
}
