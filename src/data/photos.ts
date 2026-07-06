/**
 * Wikimedia photo fetcher — free, no key, permissively licensed.
 *
 * Strategy per place:
 *   1. If OSM handed us a `wikipedia` tag, use it directly.
 *   2. Else if `wikidata`, resolve to English Wikipedia title via wbgetentities.
 *   3. Else opensearch with the place name + optional context (hub/state).
 *   4. Fetch pageimages (hero) + images list, filter out junk (icons,
 *      coats-of-arms, edit buttons), and resolve each to an 800-wide thumb.
 *
 * Caches results in localStorage for a week (photos rarely change), and
 * dedupes concurrent lookups for the same place via an in-flight map.
 */

export interface PhotoSet {
  hero: string | null
  gallery: string[]
  /** Wikipedia page url for attribution / "read more" link */
  source?: string
}

export interface PhotoQuery {
  id: string
  name: string
  /** "Wayanad, Kerala" etc. — narrows the search for common names */
  context?: string
  /** OSM wikipedia tag: "en:Article Title" */
  wikipedia?: string
  /** OSM wikidata tag: "Q12345" */
  wikidata?: string
}

const CACHE_TTL = 7 * 24 * 3600 * 1000
const cacheKey = (id: string) => `parikrama.photo.v1.${id}`
const inflight = new Map<string, Promise<PhotoSet>>()

const EMPTY: PhotoSet = { hero: null, gallery: [] }

const JUNK = /(logo|icon|coat[_ ]of[_ ]arms|flag|symbol|commons-logo|edit-icon|question|arrow|disambig|wiki|button|padlock|OOjs|infobox|semiprotection|nuvola|wikiproject|blank|placeholder|red\.svg|checkmark|external)/i

export async function photosFor(q: PhotoQuery): Promise<PhotoSet> {
  const key = cacheKey(q.id)
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const { ts, photos } = JSON.parse(raw) as { ts: number; photos: PhotoSet }
      if (Date.now() - ts < CACHE_TTL) return photos
    }
  } catch {
    /* fresh */
  }
  const cached = inflight.get(key)
  if (cached) return cached
  const p = doFetch(q).catch(() => EMPTY)
  inflight.set(key, p)
  try {
    const result = await p
    try {
      localStorage.setItem(key, JSON.stringify({ ts: Date.now(), photos: result }))
    } catch {
      /* full — fine, it's a cache */
    }
    return result
  } finally {
    inflight.delete(key)
  }
}

async function doFetch(q: PhotoQuery): Promise<PhotoSet> {
  let title: string | undefined

  if (q.wikipedia) {
    // OSM tag is like "en:Chembra Peak" — strip lang prefix
    const raw = q.wikipedia
    title = raw.includes(':') ? raw.split(':').slice(1).join(':') : raw
  } else if (q.wikidata) {
    title = await titleFromWikidata(q.wikidata)
  }

  if (!title) {
    // opensearch with hub context first for disambiguation, then bare name
    if (q.context) title = await searchTitle(`${q.name} ${q.context}`)
    if (!title) title = await searchTitle(q.name)
  }

  if (!title) return EMPTY
  return await fetchPageImages(title)
}

async function titleFromWikidata(qid: string): Promise<string | undefined> {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(qid)}&props=sitelinks&sitefilter=enwiki&format=json&origin=*`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return undefined
    const data = await res.json()
    return data?.entities?.[qid]?.sitelinks?.enwiki?.title
  } catch {
    return undefined
  }
}

async function searchTitle(query: string): Promise<string | undefined> {
  const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&namespace=0&format=json&origin=*`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return undefined
    const data = await res.json()
    return data?.[1]?.[0]
  } catch {
    return undefined
  }
}

async function fetchPageImages(title: string): Promise<PhotoSet> {
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}` +
    `&prop=pageimages%7Cimages&piprop=thumbnail&pithumbsize=800&imlimit=25&format=json&origin=*`
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) return EMPTY
  const data = await res.json()
  const page: any = Object.values(data?.query?.pages ?? {})[0]
  if (!page || page.missing !== undefined) return EMPTY

  const hero: string | null = page?.thumbnail?.source ?? null
  const source = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`

  const filenames: string[] = ((page?.images ?? []) as Array<{ title: string }>)
    .map((i) => i.title)
    .filter((t) => /\.(jpg|jpeg|png|webp)$/i.test(t))
    .filter((t) => !JUNK.test(t))

  if (filenames.length === 0) {
    return hero ? { hero, gallery: [hero], source } : EMPTY
  }

  // grab a few extras in case some resolve badly, then narrow to 5
  const chosen = filenames.slice(0, 8)
  const iiUrl =
    `https://en.wikipedia.org/w/api.php?action=query&titles=${chosen.map(encodeURIComponent).join('%7C')}` +
    `&prop=imageinfo&iiprop=url%7Csize&iiurlwidth=800&format=json&origin=*`
  const iiRes = await fetch(iiUrl, { signal: AbortSignal.timeout(10_000) })
  if (!iiRes.ok) return hero ? { hero, gallery: [hero], source } : EMPTY
  const iiData = await iiRes.json()

  const urls = Object.values(iiData?.query?.pages ?? {})
    .map((p: any) => {
      const info = p?.imageinfo?.[0]
      if (!info?.thumburl) return null
      // skip absurdly narrow crops (icons still slip through JUNK sometimes)
      if (info.width && info.width < 300) return null
      return info.thumburl as string
    })
    .filter((u): u is string => !!u)

  // hero gets top billing when present
  const gallery = hero ? [hero, ...urls.filter((u) => u !== hero)] : urls
  return { hero: gallery[0] ?? null, gallery: gallery.slice(0, 5), source }
}
