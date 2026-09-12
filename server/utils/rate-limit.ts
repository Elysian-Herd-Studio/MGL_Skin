import type { H3Event } from 'h3'

const buckets = new Map<string, number[]>()

const sweepThreshold = 10000
const sweepAgeMs = 60 * 60 * 1000

function allow(key: string, limit: number, windowSeconds: number) {
  const now = Date.now()
  const cutoff = now - windowSeconds * 1000
  const hits = (buckets.get(key) ?? []).filter(time => time > cutoff)

  if (hits.length >= limit) {
    buckets.set(key, hits)
    return false
  }

  hits.push(now)
  buckets.set(key, hits)

  if (buckets.size > sweepThreshold) {
    const staleBefore = now - sweepAgeMs
    for (const [bucketKey, times] of buckets) {
      if ((times[times.length - 1] ?? 0) < staleBefore) {
        buckets.delete(bucketKey)
      }
    }
  }

  return true
}

export function enforceRateLimit(
  event: H3Event,
  scope: string,
  limit: number,
  windowSeconds: number,
  discriminator?: string
) {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const key = discriminator
    ? `${scope}:${ip}:${discriminator.toLowerCase()}`
    : `${scope}:${ip}`

  if (!allow(key, limit, windowSeconds)) {
    throw createError({
      statusCode: 429,
      statusMessage: '请求过于频繁，请稍后再试',
      data: { code: 'RATE_LIMITED' }
    })
  }
}
