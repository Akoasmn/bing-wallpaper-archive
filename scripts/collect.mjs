import { archiveRoot } from './archive.mjs'
import { collectWallpaper } from './bing.mjs'

try {
  const result = await collectWallpaper(archiveRoot)
  const message = {
    added: '已归档', repaired: '已修复归档', unchanged: '已存在，复用归档', stale: '源站记录早于现有归档',
  }
  console.log(`${result.date} ${message[result.status]}`)
} catch (error) {
  console.error('采集失败', error)
  process.exitCode = 1
}
