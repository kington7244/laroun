export interface RateLimitContext {
    ip: string
    limit: number
    window: number // in seconds
}

interface RateLimitResult {
    success: boolean
    limit: number
    remaining: number
    reset: number
}

// Simple in-memory LRU-like store for rate limiting
// In production with multiple instances, use Redis (ioredis) instead
class MemoryStore {
    private hits = new Map<string, { count: number; reset: number }>()

    constructor(private cleanIntervalMs: number = 60000) {
        // Cleanup expired entries periodically
        if (typeof setInterval !== 'undefined') {
            setInterval(() => this.cleanup(), this.cleanIntervalMs)
        }
    }

    private cleanup() {
        const now = Date.now()
        for (const [key, value] of this.hits.entries()) {
            if (value.reset < now) {
                this.hits.delete(key)
            }
        }
    }

    async increment(key: string, window: number): Promise<{ count: number; reset: number }> {
        const now = Date.now()
        const record = this.hits.get(key)

        if (!record || record.reset < now) {
            const reset = now + window * 1000
            const newRecord = { count: 1, reset }
            this.hits.set(key, newRecord)
            return newRecord
        }

        record.count += 1
        return record
    }
}

const store = new MemoryStore()

export async function rateLimit(context: RateLimitContext): Promise<RateLimitResult> {
    const { ip, limit, window } = context
    const key = `rate_limit:${ip}`

    const { count, reset } = await store.increment(key, window)

    return {
        success: count <= limit,
        limit,
        remaining: Math.max(0, limit - count),
        reset
    }
}
