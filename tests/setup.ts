import '@testing-library/jest-dom/vitest'
import { beforeAll, afterEach, afterAll, vi } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Mock server for API testing
export const server = setupServer(
  // Mock Supabase auth endpoints
  http.post('*/auth/v1/token', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'mock-user-id',
        email: 'test@example.com',
      }
    })
  }),
  
  // Mock API endpoints
  http.post('/api/users', () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: 'mock-user-id',
        email: 'test@example.com',
        name: 'Test User',
        planType: 'free',
      }
    })
  }),
  
  http.get('/api/users/me', () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: 'mock-user-id',
        email: 'test@example.com',
        name: 'Test User',
        plan_id: 'free',
      }
    })
  }),
  
  http.get('/api/subscription/status', () => {
    return HttpResponse.json({
      success: true,
      data: {
        plan_id: 'free',
        plan_name: '無料プラン',
        status: 'free',
        features: {
          ai_requests: { enabled: false, limit_value: 0 },
        }
      }
    })
  })
)

// Establish API mocking before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests
afterEach(() => server.resetHandlers())

// Clean up after the tests are finished
afterAll(() => server.close())

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/',
}))

// Mock Supabase client
vi.mock('../apps/web/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ 
        data: { subscription: { unsubscribe: vi.fn() } } 
      })),
    }
  },
  createServerSupabaseClient: vi.fn(),
}))