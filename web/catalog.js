const siteBase = new URL(import.meta.env.BASE_URL, document.baseURI)
const requests = new Map()

export function siteUrl(path) {
  return new URL(path, siteBase).href
}

function readJson(path) {
  if (!requests.has(path)) {
    requests.set(path, fetch(siteUrl(`metadata/${path}`)).then(async response => {
      if (!response.ok) throw new Error(`图片数据暂时无法加载（${response.status}）`)
      const data = await response.json()
      if (data?.schemaVersion !== 1) throw new Error('图片数据格式暂不可用')
      return data
    }).catch(error => {
      requests.delete(path)
      throw error
    }))
  }
  return requests.get(path)
}

export const loadIndex = async () => (await readJson('index.json')).months
export const loadLatest = async () => (await readJson('latest.json')).record
export const loadMonth = async month => (await readJson(`months/${month}.json`)).records
