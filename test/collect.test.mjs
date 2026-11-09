import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, unlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { collectWallpaper } from '../scripts/bing.mjs'
import { readMonths, verifyArchive, writeIndexes } from '../scripts/archive.mjs'

// Synthetic JPEG frame headers isolate the collector's dimension check.
const hd = Buffer.from('ffd8ffc0000b080438078001011100ffd9', 'hex')
const small = Buffer.from('ffd8ffc0000b0801e0028001011100ffd9', 'hex')
const image = {
  fullstartdate: '202610311600',
  startdate: '20261031',
  enddate: '20261101',
  urlbase: '/th?id=OHR.MonthBoundary',
  copyright: '图片版权说明',
  title: '跨月壁纸',
  wp: true,
}

async function temporaryArchive(t) {
  const prefix = resolve('.test-bing-')
  const root = await mkdtemp(prefix)
  assert.ok(resolve(root).startsWith(prefix))
  t.after(() => rm(root, { recursive: true, force: true }))
  return root
}

function mockBing(metadata, bytes) {
  const calls = []
  return {
    calls,
    fetch: async url => {
      calls.push(url)
      return url.includes('/HPImageArchive.aspx') ? Response.json({ images: [metadata] }) : new Response(bytes)
    },
  }
}

test('collects under the Shanghai date and safely reuses or repairs the archived wallpaper', async t => {
  const root = await temporaryArchive(t)
  const source = mockBing(image, hd)
  const date = '2026-11-01'
  assert.deepEqual(await collectWallpaper(root, source.fetch), { date, status: 'added' })
  assert.match(source.calls[1], /OHR\.MonthBoundary_1920x1080\.jpg$/)
  const before = await readFile(join(root, 'metadata', 'latest.json'), 'utf8')
  const record = JSON.parse(before).record
  assert.equal(record.image, `images/2026-11/${date}/1920x1080.jpg`)
  assert.equal(record.uhdUrl, 'https://cn.bing.com/th?id=OHR.MonthBoundary_UHD.jpg')

  assert.deepEqual(await collectWallpaper(root, source.fetch), { date, status: 'unchanged' })
  assert.equal(source.calls.length, 3)
  assert.equal(await readFile(join(root, 'metadata', 'latest.json'), 'utf8'), before)

  await unlink(join(root, record.image))
  await assert.rejects(async () => verifyArchive(root, await readMonths(root)), /归档图片缺失/)
  assert.deepEqual(await collectWallpaper(root, source.fetch), { date, status: 'repaired' })
  assert.equal((await readMonths(root)).get('2026-11').length, 1)
})

test('keeps the previous snapshot when the new wallpaper has the wrong dimensions', async t => {
  const root = await temporaryArchive(t)
  await collectWallpaper(root, mockBing(image, hd).fetch)
  const before = await readFile(join(root, 'metadata', 'latest.json'), 'utf8')
  const next = mockBing({ ...image, fullstartdate: '202611011600', urlbase: '/th?id=OHR.NextDay' }, small)
  await assert.rejects(collectWallpaper(root, next.fetch), /1920×1080 JPEG/)
  assert.equal(await readFile(join(root, 'metadata', 'latest.json'), 'utf8'), before)
  assert.equal((await readMonths(root)).get('2026-11').length, 1)
})

test('generates readable empty indexes for the first Pages deployment', async t => {
  const root = await temporaryArchive(t)
  await writeIndexes(root, await readMonths(root))
  const index = JSON.parse(await readFile(join(root, 'metadata', 'index.json'), 'utf8'))
  const latest = JSON.parse(await readFile(join(root, 'metadata', 'latest.json'), 'utf8'))
  assert.deepEqual(index, { schemaVersion: 1, months: [] })
  assert.deepEqual(latest, { schemaVersion: 1, record: null })
})
