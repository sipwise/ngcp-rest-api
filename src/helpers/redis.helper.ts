import Redis, {Cluster} from 'ioredis'

export async function findKeys(redis: Redis | Cluster, pattern: string, limit: number = 100): Promise<string[]> {
    let cursor = '0'
    let keys: string[] = []
    do {
        const result = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', limit)
        cursor = result[0]
        keys = keys.concat(result[1])

        if (keys.length >= limit) {
            return keys.slice(0, limit)
        }
    } while (cursor !== '0')

    return keys
}

export async function keyExists(redis: Redis | Cluster, pattern: string): Promise<boolean> {
    return (await findKeys(redis, pattern, 1)).length > 0
}

export async function findFirstKey(redis: Redis | Cluster, pattern: string): Promise<string | null> {
    const keys = await findKeys(redis, pattern, 1)
    return keys.length > 0 ? keys[0] : null
}