import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('redis cache', () => {
  let mockRedisGet: ReturnType<typeof vi.fn>
  let mockRedisSet: ReturnType<typeof vi.fn>
  let getCache: (key: string) => Promise<unknown>
  let setCache: (key: string, value: unknown, ttlSeconds: number) => Promise<void>

  beforeEach(async () => {
    // Reset all mocks and modules before each test
    vi.resetModules()
    vi.clearAllMocks()

    // Setup the @upstash/redis mock
    mockRedisGet = vi.fn()
    mockRedisSet = vi.fn()

    vi.doMock('@upstash/redis', () => ({
      Redis: vi.fn(function () {
        return {
          get: mockRedisGet,
          set: mockRedisSet,
        }
      }),
    }))

    // Dynamically import after mock is set
    const redisModule = await import('@/lib/redis')
    getCache = redisModule.getCache
    setCache = redisModule.setCache
  })

  describe('getCache', () => {
    it('returns the cached value on a cache hit', async () => {
      mockRedisGet.mockResolvedValue({ code: 'CO-29', description: 'Timely Filing' })

      const result = await getCache('ma:cache:denial-code:co-29')

      expect(mockRedisGet).toHaveBeenCalledWith('ma:cache:denial-code:co-29')
      expect(result).toEqual({ code: 'CO-29', description: 'Timely Filing' })
    })

    it('returns null on a cache miss (Redis returns null)', async () => {
      mockRedisGet.mockResolvedValue(null)

      const result = await getCache('ma:cache:denial-code:co-99')

      expect(result).toBeNull()
    })

    it('returns null and logs error when Redis throws', async () => {
      mockRedisGet.mockRejectedValue(new Error('Redis connection failed'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await getCache('ma:cache:denial-code:co-50')

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith('[redis] getCache error:', 'ma:cache:denial-code:co-50', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('setCache', () => {
    it('calls Redis.set with the correct key, value, and ex TTL option', async () => {
      mockRedisSet.mockResolvedValue('OK')

      await setCache('ma:cache:denial-code:co-29', { code: 'CO-29' }, 604800)

      expect(mockRedisSet).toHaveBeenCalledWith(
        'ma:cache:denial-code:co-29',
        { code: 'CO-29' },
        { ex: 604800 }
      )
    })

    it('does not throw when Redis.set fails', async () => {
      mockRedisSet.mockRejectedValue(new Error('Redis write error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(setCache('ma:cache:denial-code:co-29', { code: 'CO-29' }, 3600)).resolves.toBeUndefined()
      expect(consoleSpy).toHaveBeenCalledWith('[redis] setCache error:', 'ma:cache:denial-code:co-29', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })
})
