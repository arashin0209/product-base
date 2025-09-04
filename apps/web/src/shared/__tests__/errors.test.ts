import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  ExternalServiceError,
} from '../errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create AppError with default status code', () => {
      const error = new AppError('Test error', 'TEST_ERROR');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('AppError');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
    });

    it('should create AppError with custom status code', () => {
      const error = new AppError('Test error', 'TEST_ERROR', 400);

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('AppError');
    });

    it('should be serializable', () => {
      const error = new AppError('Test error', 'TEST_ERROR', 400);
      const serialized = JSON.stringify(error);

      expect(serialized).toContain('TEST_ERROR');
      expect(serialized).toContain('400');
      // Error オブジェクトの message は JSON.stringify では含まれない
    });
  });

  describe('ValidationError', () => {
    it('should create ValidationError with correct properties', () => {
      const error = new ValidationError('Invalid input data');

      expect(error.message).toBe('Invalid input data');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('AppError');
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof ValidationError).toBe(true);
    });

    it('should handle empty message', () => {
      const error = new ValidationError('');

      expect(error.message).toBe('');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('AuthenticationError', () => {
    it('should create AuthenticationError with default message', () => {
      const error = new AuthenticationError();

      expect(error.message).toBe('Authentication required');
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.statusCode).toBe(401);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof AuthenticationError).toBe(true);
    });

    it('should create AuthenticationError with custom message', () => {
      const error = new AuthenticationError('Invalid token');

      expect(error.message).toBe('Invalid token');
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('AuthorizationError', () => {
    it('should create AuthorizationError with default message', () => {
      const error = new AuthorizationError();

      expect(error.message).toBe('Insufficient permissions');
      expect(error.code).toBe('AUTHORIZATION_ERROR');
      expect(error.statusCode).toBe(403);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof AuthorizationError).toBe(true);
    });

    it('should create AuthorizationError with custom message', () => {
      const error = new AuthorizationError('Access denied to this resource');

      expect(error.message).toBe('Access denied to this resource');
      expect(error.code).toBe('AUTHORIZATION_ERROR');
      expect(error.statusCode).toBe(403);
    });
  });

  describe('NotFoundError', () => {
    it('should create NotFoundError with default message', () => {
      const error = new NotFoundError();

      expect(error.message).toBe('Resource not found');
      expect(error.code).toBe('NOT_FOUND_ERROR');
      expect(error.statusCode).toBe(404);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof NotFoundError).toBe(true);
    });

    it('should create NotFoundError with custom message', () => {
      const error = new NotFoundError('User not found');

      expect(error.message).toBe('User not found');
      expect(error.code).toBe('NOT_FOUND_ERROR');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('ConflictError', () => {
    it('should create ConflictError with default message', () => {
      const error = new ConflictError();

      expect(error.message).toBe('Resource already exists');
      expect(error.code).toBe('CONFLICT_ERROR');
      expect(error.statusCode).toBe(409);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof ConflictError).toBe(true);
    });

    it('should create ConflictError with custom message', () => {
      const error = new ConflictError('Email already registered');

      expect(error.message).toBe('Email already registered');
      expect(error.code).toBe('CONFLICT_ERROR');
      expect(error.statusCode).toBe(409);
    });
  });

  describe('ExternalServiceError', () => {
    it('should create ExternalServiceError with service name', () => {
      const error = new ExternalServiceError('Service unavailable', 'stripe');

      expect(error.message).toBe('Service unavailable');
      expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
      expect(error.statusCode).toBe(502);
      expect(error.service).toBe('stripe');
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof ExternalServiceError).toBe(true);
    });

    it('should handle different service names', () => {
      const services = ['stripe', 'supabase', 'email', 'analytics'];
      
      services.forEach(service => {
        const error = new ExternalServiceError(`Error from ${service}`, service);
        
        expect(error.service).toBe(service);
        expect(error.message).toBe(`Error from ${service}`);
        expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
        expect(error.statusCode).toBe(502);
      });
    });
  });

  describe('Error inheritance', () => {
    it('should maintain proper inheritance chain', () => {
      const validationError = new ValidationError('test');
      const authError = new AuthenticationError('test');
      const notFoundError = new NotFoundError('test');
      const externalError = new ExternalServiceError('test', 'service');

      // All should be instances of Error
      expect(validationError instanceof Error).toBe(true);
      expect(authError instanceof Error).toBe(true);
      expect(notFoundError instanceof Error).toBe(true);
      expect(externalError instanceof Error).toBe(true);

      // All should be instances of AppError
      expect(validationError instanceof AppError).toBe(true);
      expect(authError instanceof AppError).toBe(true);
      expect(notFoundError instanceof AppError).toBe(true);
      expect(externalError instanceof AppError).toBe(true);

      // Specific error types
      expect(validationError instanceof ValidationError).toBe(true);
      expect(authError instanceof AuthenticationError).toBe(true);
      expect(notFoundError instanceof NotFoundError).toBe(true);
      expect(externalError instanceof ExternalServiceError).toBe(true);
    });
  });

  describe('Error properties', () => {
    it('should have correct property types', () => {
      const error = new AppError('test', 'TEST', 400);

      expect(typeof error.message).toBe('string');
      expect(typeof error.code).toBe('string');
      expect(typeof error.statusCode).toBe('number');
      expect(typeof error.name).toBe('string');
    });

    it('should have properties that can be modified', () => {
      const error = new AppError('test', 'TEST', 400);

      // TypeScript では readonly だが、実行時には変更可能
      (error as any).code = 'NEW_CODE';
      
      // 実際には変更される
      expect(error.code).toBe('NEW_CODE');
    });
  });

  describe('Error serialization', () => {
    it('should serialize correctly for logging', () => {
      const error = new ValidationError('Invalid email format');
      const serialized = {
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        stack: error.stack,
      };

      expect(serialized.name).toBe('AppError');
      expect(serialized.message).toBe('Invalid email format');
      expect(serialized.code).toBe('VALIDATION_ERROR');
      expect(serialized.statusCode).toBe(400);
      expect(serialized.stack).toBeDefined();
    });

    it('should handle ExternalServiceError serialization', () => {
      const error = new ExternalServiceError('API timeout', 'stripe');
      const serialized = {
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        service: error.service,
        stack: error.stack,
      };

      expect(serialized.service).toBe('stripe');
      expect(serialized.message).toBe('API timeout');
    });
  });
});
