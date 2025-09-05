import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/apps/web/components/auth/LoginForm'
import { SignupForm } from '@/apps/web/components/auth/SignupForm'

// Mock the auth hook
vi.mock('@/apps/web/hooks/useAuth', () => ({
  useAuth: vi.fn()
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))

const mockUseAuth = await import('@/apps/web/hooks/useAuth')

describe('Authentication Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('LoginForm', () => {
    const mockAuth = {
      user: null,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      signInWithOAuth: vi.fn(),
    }

    beforeEach(() => {
      mockUseAuth.useAuth.mockReturnValue(mockAuth)
    })

    it('should render login form with email and password fields', () => {
      render(<LoginForm />)
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('should call signIn when form is submitted with valid data', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAuth.signIn).toHaveBeenCalledWith('test@example.com', 'password123')
      })
    })

    it('should show validation errors for empty fields', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
    })

    it('should show validation error for invalid email format', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'invalid-email')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
      })
    })

    it('should disable submit button when loading', () => {
      mockUseAuth.useAuth.mockReturnValue({
        ...mockAuth,
        loading: true
      })

      render(<LoginForm />)
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      expect(submitButton).toBeDisabled()
    })

    it('should show OAuth login options', () => {
      render(<LoginForm />)
      
      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
    })

    it('should call signInWithOAuth when OAuth button is clicked', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)
      
      const googleButton = screen.getByRole('button', { name: /continue with google/i })
      await user.click(googleButton)

      expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith('google')
    })
  })

  describe('SignupForm', () => {
    const mockAuth = {
      user: null,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      signInWithOAuth: vi.fn(),
    }

    beforeEach(() => {
      mockUseAuth.useAuth.mockReturnValue(mockAuth)
    })

    it('should render signup form with all required fields', () => {
      render(<SignupForm />)
      
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    })

    it('should call signUp when form is submitted with valid data', async () => {
      const user = userEvent.setup()
      render(<SignupForm />)
      
      const nameInput = screen.getByLabelText(/name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAuth.signUp).toHaveBeenCalledWith(
          'test@example.com',
          'password123',
          'John Doe'
        )
      })
    })

    it('should show validation error when passwords do not match', async () => {
      const user = userEvent.setup()
      render(<SignupForm />)
      
      const nameInput = screen.getByLabelText(/name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'different-password')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/passwords must match/i)).toBeInTheDocument()
      })
    })

    it('should show validation error for weak password', async () => {
      const user = userEvent.setup()
      render(<SignupForm />)
      
      const nameInput = screen.getByLabelText(/name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, '123')
      await user.type(confirmPasswordInput, '123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
      })
    })

    it('should require acceptance of terms and conditions', async () => {
      const user = userEvent.setup()
      render(<SignupForm />)
      
      const nameInput = screen.getByLabelText(/name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/you must accept the terms/i)).toBeInTheDocument()
      })
    })

    it('should show OAuth signup options', () => {
      render(<SignupForm />)
      
      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
    })
  })
})