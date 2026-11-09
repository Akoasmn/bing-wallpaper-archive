import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { archiveRoot, readMonths, verifyArchive, writeIndexes, writeMonth } from './archive.mjs'

const output = resolve('dist')
const months = await readMonths(archiveRoot)
await verifyArchive(archiveRoot, months)

for (const [month, records] of months) {
  for (const { image } of records) {
    const destination = join(output, image)
    await mkdir(dirname(destination), { recursive: true })
    await copyFile(join(archiveRoot, image), destination)
  }
  await writeMonth(output, month, records)
}
await writeIndexes(output, months)
