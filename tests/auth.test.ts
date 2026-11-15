import { describe, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'
import {
  getAuthenticatedUser,
  loginSchema,
  requireAdmin,
} from '../server/utils/auth'
import adminMiddleware from '../server/middleware/admin'
import loginHandler from '../server/api/auth/login.post'
import logoutHandler from '../server/api/auth/logout.post'
import meHandler from '../server/api/auth/me.get'
import statusHandler from '../server/api/admin/status.get'

// Stub #supabase/server services
const mockServerSupabaseUser = vi.fn()
const mockServerSupabaseClient = vi.fn()
const mockServerSupabaseServiceRole = vi.fn()

vi.mock('#supabase/server', () => ({
  serverSupabaseUser: (event: H3Event) => mockServerSupabaseUser(event),
  serverSupabaseClient: (event: H3Event) => mockServerSupabaseClient(event),
  serverSupabaseServiceRole: (event: H3Event) => mockServerSupabaseServiceRole(event),
}))

function createMockEvent(options: {
  path?: string
  method?: string
  headers?: Record<string, string>
  body?: unknown
} = {}): H3Event {
  const headers = new Headers(options.headers ?? {})
  const req: Record<string | symbol, unknown> = {
    headers: Object.fromEntries(headers.entries()),
    method: (options.method ?? 'GET').toUpperCase(),
  }
  if (options.body !== undefined) {
    req[Symbol.for('h3ParsedBody')] = options.body
  }
  return {
    path: options.path ?? '/api/test',
    method: options.method ?? 'GET',
    node: { req },
    context: {},
  } as unknown as H3Event
}

describe('loginSchema validation', () => {
  it('accepts valid credentials', () => {
    const valid = loginSchema.safeParse({
      email: 'admin@spacerelics.space',
      password: 'strongpassword123',
    })
    expect(valid.success).toBe(true)
  })

  it('rejects invalid email formats', () => {
    const invalid = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    })
    expect(invalid.success).toBe(false)
    if (!invalid.success) {
      expect(invalid.error.issues[0]?.message).toMatch(/email válido/i)
    }
  })

  it('rejects passwords shorter than 8 characters', () => {
    const invalid = loginSchema.safeParse({
      email: 'admin@spacerelics.space',
      password: '1234567',
    })
    expect(invalid.success).toBe(false)
    if (!invalid.success) {
      expect(invalid.error.issues[0]?.message).toMatch(/8 caracteres/i)
    }
  })
})

describe('getAuthenticatedUser', () => {
  it('extracts user claims from SSR session', async () => {
    mockServerSupabaseUser.mockResolvedValueOnce({
      sub: 'user-uuid-1',
      email: 'admin@spacerelics.space',
    })

    const event = createMockEvent()
    const user = await getAuthenticatedUser(event)
    expect(user).toEqual({
      id: 'user-uuid-1',
      email: 'admin@spacerelics.space',
    })
  })

  it('extracts user from Bearer authorization header fallback', async () => {
    mockServerSupabaseUser.mockResolvedValueOnce(null)
    const mockGetUser = vi.fn().mockResolvedValueOnce({
      data: { user: { id: 'bearer-user-uuid', email: 'token@spacerelics.space' } },
      error: null,
    })
    mockServerSupabaseClient.mockResolvedValueOnce({
      auth: { getUser: mockGetUser },
    })

    const event = createMockEvent({
      headers: { authorization: 'Bearer valid-jwt-token' },
    })
    const user = await getAuthenticatedUser(event)
    expect(user).toEqual({
      id: 'bearer-user-uuid',
      email: 'token@spacerelics.space',
    })
    expect(mockGetUser).toHaveBeenCalledWith('valid-jwt-token')
  })

  it('returns null when no session and no valid token exist', async () => {
    mockServerSupabaseUser.mockResolvedValueOnce(null)
    const event = createMockEvent()
    const user = await getAuthenticatedUser(event)
    expect(user).toBeNull()
  })
})

describe('requireAdmin', () => {
  it('throws 401 when the user is unauthenticated', async () => {
    mockServerSupabaseUser.mockResolvedValueOnce(null)
    const event = createMockEvent()

    await expect(requireAdmin(event)).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  })

  it('throws 500 when admin lookup fails due to infrastructure error', async () => {
    mockServerSupabaseUser.mockResolvedValueOnce({ sub: 'admin-uuid-1', email: 'admin@spacerelics.space' })
    mockServerSupabaseServiceRole.mockReturnValueOnce({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: null, error: { message: 'db down' } }),
          }),
        }),
      }),
    })

    const event = createMockEvent()
    await expect(requireAdmin(event)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
    })
  })

  it('returns admin data when authenticated user is in admin_users', async () => {
    mockServerSupabaseUser.mockResolvedValueOnce({ sub: 'admin-uuid-1', email: 'admin@spacerelics.space' })
    mockServerSupabaseServiceRole.mockReturnValueOnce({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValueOnce({
              data: { user_id: 'admin-uuid-1', email: 'admin@spacerelics.space' },
              error: null,
            }),
          }),
        }),
      }),
    })

    const event = createMockEvent()
    const admin = await requireAdmin(event)
    expect(admin).toEqual({
      id: 'admin-uuid-1',
      email: 'admin@spacerelics.space',
      isDemo: false,
    })
  })

  it('allows the public demo email without an admin_users row, flagged isDemo', async () => {
    mockServerSupabaseUser.mockResolvedValueOnce({ sub: 'demo-id', email: 'juiz@gmail.com' })
    mockServerSupabaseServiceRole.mockReturnValueOnce({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: null, error: null }),
          }),
        }),
      }),
    })

    const event = createMockEvent()
    const admin = await requireAdmin(event)
    expect(admin).toEqual({
      id: 'demo-id',
      email: 'juiz@gmail.com',
      isDemo: true,
    })
  })

  it('rejects an authenticated user that is neither admin nor demo', async () => {
    mockServerSupabaseUser.mockResolvedValueOnce({ sub: 'random-id', email: 'random@example.com' })
    mockServerSupabaseServiceRole.mockReturnValueOnce({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: null, error: null }),
          }),
        }),
      }),
    })

    await expect(requireAdmin(createMockEvent())).rejects.toMatchObject({
      statusCode: 403,
    })
  })
})

describe('admin middleware', () => {
  it('intercepts and enforces admin check on /api/admin/* paths', async () => {
    mockServerSupabaseUser.mockResolvedValueOnce(null)
    const event = createMockEvent({ path: '/api/admin/relics' })

    await expect(adminMiddleware(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('enforces admin check on exact /api/admin path', async () => {
    mockServerSupabaseUser.mockResolvedValueOnce(null)
    const event = createMockEvent({ path: '/api/admin' })

    await expect(adminMiddleware(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('does not intercept paths that merely contain /api/admin in name', async () => {
    const event = createMockEvent({ path: '/api/administer' })
    await expect(adminMiddleware(event)).resolves.toBeUndefined()
  })

  it('passes through for public or non-admin paths', async () => {
    const event = createMockEvent({ path: '/api/public/relics' })
    await expect(adminMiddleware(event)).resolves.toBeUndefined()
  })

  it('lets the demo read/GET admin endpoints', async () => {
    mockServerSupabaseUser.mockResolvedValueOnce({ sub: 'demo-id', email: 'juiz@gmail.com' })
    mockServerSupabaseServiceRole.mockReturnValueOnce({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: null, error: null }),
          }),
        }),
      }),
    })

    const event = createMockEvent({ path: '/api/admin/relics', method: 'GET' })
    await expect(adminMiddleware(event)).resolves.toBeUndefined()
  })

  it('blocks demo writes (POST/PUT/PATCH/DELETE) with 403', async () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      mockServerSupabaseUser.mockResolvedValueOnce({ sub: 'demo-id', email: 'juiz@gmail.com' })
      mockServerSupabaseServiceRole.mockReturnValueOnce({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValueOnce({ data: null, error: null }),
            }),
          }),
        }),
      })

      const event = createMockEvent({ path: '/api/admin/relics', method })
      await expect(adminMiddleware(event)).rejects.toMatchObject({
        statusCode: 403,
        message: 'Conta demo: só leitura. Nenhuma alteração é guardada.',
      })
    }
  })
})

describe('auth endpoints', () => {
  it('POST /api/auth/login validates body with 400 on bad input', async () => {
    const event = createMockEvent({
      body: { email: 'invalid-email', password: '12' },
    })
    await expect(loginHandler(event)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('POST /api/auth/login rejects invalid credentials with 401', async () => {
    const mockSignIn = vi.fn().mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid login credentials' },
    })
    mockServerSupabaseClient.mockResolvedValueOnce({
      auth: { signInWithPassword: mockSignIn },
    })

    const event = createMockEvent({
      body: { email: 'admin@spacerelics.space', password: 'wrongpassword' },
    })
    await expect(loginHandler(event)).rejects.toMatchObject({
      statusCode: 401,
      message: 'Credenciais incorrectas.',
    })
  })

  it('POST /api/auth/login rejects authenticated non-admin with 403 and signs out', async () => {
    const mockSignOut = vi.fn().mockResolvedValueOnce({})
    const mockSignIn = vi.fn().mockResolvedValueOnce({
      data: { user: { id: 'non-admin-id', email: 'user@test.space' } },
      error: null,
    })
    mockServerSupabaseClient.mockResolvedValueOnce({
      auth: { signInWithPassword: mockSignIn, signOut: mockSignOut },
    })
    mockServerSupabaseServiceRole.mockReturnValueOnce({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: null, error: null }),
          }),
        }),
      }),
    })

    const event = createMockEvent({
      body: { email: 'user@test.space', password: 'validpassword' },
    })
    await expect(loginHandler(event)).rejects.toMatchObject({
      statusCode: 403,
      message: 'Acesso restrito a administradores.',
    })
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('POST /api/auth/login succeeds for confirmed admin user', async () => {
    const mockSignIn = vi.fn().mockResolvedValueOnce({
      data: { user: { id: 'admin-id', email: 'admin@spacerelics.space' } },
      error: null,
    })
    mockServerSupabaseClient.mockResolvedValueOnce({
      auth: { signInWithPassword: mockSignIn },
    })
    mockServerSupabaseServiceRole.mockReturnValueOnce({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValueOnce({
              data: { user_id: 'admin-id', email: 'admin@spacerelics.space' },
              error: null,
            }),
          }),
        }),
      }),
    })

    const event = createMockEvent({
      body: { email: 'admin@spacerelics.space', password: 'validpassword' },
    })
    const res = await loginHandler(event)
    expect(res).toEqual({
      ok: true,
      user: {
        id: 'admin-id',
        email: 'admin@spacerelics.space',
        isDemo: false,
      },
    })
  })

  it('POST /api/auth/login succeeds for the demo account without an admin row', async () => {
    const mockSignIn = vi.fn().mockResolvedValueOnce({
      data: { user: { id: 'demo-id', email: 'juiz@gmail.com' } },
      error: null,
    })
    mockServerSupabaseClient.mockResolvedValueOnce({
      auth: { signInWithPassword: mockSignIn },
    })
    mockServerSupabaseServiceRole.mockReturnValueOnce({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: null, error: null }),
          }),
        }),
      }),
    })

    const event = createMockEvent({
      body: { email: 'juiz@gmail.com', password: '12345678' },
    })
    const res = await loginHandler(event)
    expect(res).toEqual({
      ok: true,
      user: {
        id: 'demo-id',
        email: 'juiz@gmail.com',
        isDemo: true,
      },
    })
  })

  it('POST /api/auth/logout signs out and returns ok', async () => {
    const mockSignOut = vi.fn().mockResolvedValueOnce({})
    mockServerSupabaseClient.mockResolvedValueOnce({
      auth: { signOut: mockSignOut },
    })

    const event = createMockEvent()
    const res = await logoutHandler(event)
    expect(res).toEqual({ ok: true })
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('GET /api/auth/me returns unauthenticated status when no session exists', async () => {
    mockServerSupabaseUser.mockResolvedValueOnce(null)
    const event = createMockEvent()
    const res = await meHandler(event)
    expect(res).toEqual({
      authenticated: false,
      user: null,
    })
  })

  it('GET /api/auth/me returns authenticated admin user', async () => {
    mockServerSupabaseUser.mockResolvedValueOnce({ sub: 'admin-id', email: 'admin@spacerelics.space' })
    mockServerSupabaseServiceRole.mockReturnValueOnce({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValueOnce({
              data: { user_id: 'admin-id', email: 'admin@spacerelics.space' },
              error: null,
            }),
          }),
        }),
      }),
    })

    const event = createMockEvent()
    const res = await meHandler(event)
    expect(res).toEqual({
      authenticated: true,
      user: {
        id: 'admin-id',
        email: 'admin@spacerelics.space',
        isDemo: false,
      },
    })
  })

  it('GET /api/auth/me returns the demo account flagged isDemo', async () => {
    mockServerSupabaseUser.mockResolvedValueOnce({ sub: 'demo-id', email: 'juiz@gmail.com' })
    mockServerSupabaseServiceRole.mockReturnValueOnce({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: null, error: null }),
          }),
        }),
      }),
    })

    const res = await meHandler(createMockEvent())
    expect(res).toEqual({
      authenticated: true,
      user: {
        id: 'demo-id',
        email: 'juiz@gmail.com',
        isDemo: true,
      },
    })
  })

  it('GET /api/admin/status runs requireAdmin and returns admin info', async () => {
    mockServerSupabaseUser.mockResolvedValueOnce({ sub: 'admin-id', email: 'admin@spacerelics.space' })
    mockServerSupabaseServiceRole.mockReturnValueOnce({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValueOnce({
              data: { user_id: 'admin-id', email: 'admin@spacerelics.space' },
              error: null,
            }),
          }),
        }),
      }),
    })

    const event = createMockEvent({ path: '/api/admin/status' })
    const res = await statusHandler(event)
    expect(res.ok).toBe(true)
    expect(res.admin).toEqual({
      id: 'admin-id',
      email: 'admin@spacerelics.space',
      isDemo: false,
    })
    expect(res.timestamp).toBeDefined()
  })
})
