import { Result, success, failure } from '../result';

describe('Result', () => {
  describe('success', () => {
    it('should create a success result with data', () => {
      const data = { id: '123', name: 'Test' };
      const result = success(data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.error).toBeUndefined();
    });

    it('should create a success result with primitive data', () => {
      const result = success('test string');

      expect(result.success).toBe(true);
      expect(result.data).toBe('test string');
    });

    it('should create a success result with null data', () => {
      const result = success(null);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should create a success result with undefined data', () => {
      const result = success(undefined);

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
    });
  });

  describe('failure', () => {
    it('should create a failure result with error', () => {
      const error = new Error('Test error');
      const result = failure(error);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.data).toBeUndefined();
    });

    it('should create a failure result with string error', () => {
      const errorMessage = 'Test error message';
      const result = failure(errorMessage);

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
    });

    it('should create a failure result with custom error object', () => {
      const customError = { code: 'CUSTOM_ERROR', message: 'Custom error' };
      const result = failure(customError);

      expect(result.success).toBe(false);
      expect(result.error).toBe(customError);
    });
  });

  describe('type guards', () => {
    it('should correctly identify success results', () => {
      const successResult = success('test');
      
      if (successResult.success) {
        expect(successResult.data).toBe('test');
        // TypeScript should know this is a success result
        expect(typeof successResult.data).toBe('string');
      }
    });

    it('should correctly identify failure results', () => {
      const failureResult = failure('error');
      
      if (!failureResult.success) {
        expect(failureResult.error).toBe('error');
        // TypeScript should know this is a failure result
        expect(typeof failureResult.error).toBe('string');
      }
    });
  });

  describe('chaining and composition', () => {
    it('should handle chained operations with success', () => {
      const result1 = success(10);
      const result2 = result1.success ? success(result1.data * 2) : failure('Error');
      
      expect(result2.success).toBe(true);
      if (result2.success) {
        expect(result2.data).toBe(20);
      }
    });

    it('should handle chained operations with failure', () => {
      const result1 = failure('First error');
      const result2 = result1.success ? success(result1.data * 2) : failure('Second error');
      
      expect(result2.success).toBe(false);
      if (!result2.success) {
        expect(result2.error).toBe('Second error');
      }
    });
  });

  describe('async operations', () => {
    it('should work with async functions', async () => {
      const asyncFunction = async (): Promise<Result<string, Error>> => {
        try {
          const data = await Promise.resolve('async data');
          return success(data);
        } catch (error) {
          return failure(error as Error);
        }
      };

      const result = await asyncFunction();
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('async data');
      }
    });

    it('should handle async errors', async () => {
      const asyncFunction = async (): Promise<Result<string, Error>> => {
        try {
          await Promise.reject(new Error('Async error'));
          return success('data');
        } catch (error) {
          return failure(error as Error);
        }
      };

      const result = await asyncFunction();
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Async error');
      }
    });
  });

  describe('utility functions', () => {
    it('should create success result with factory function', () => {
      const createSuccess = <T>(data: T): Result<T, never> => success(data);
      const result = createSuccess({ id: 1, name: 'Test' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(1);
        expect(result.data.name).toBe('Test');
      }
    });

    it('should create failure result with factory function', () => {
      const createFailure = <E>(error: E): Result<never, E> => failure(error);
      const result = createFailure('Custom error');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Custom error');
      }
    });
  });

  describe('complex data types', () => {
    it('should handle arrays', () => {
      const data = [1, 2, 3, 4, 5];
      const result = success(data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBe(5);
      }
    });

    it('should handle objects with nested properties', () => {
      const data = {
        user: {
          id: '123',
          profile: {
            name: 'John Doe',
            email: 'john@example.com'
          }
        },
        settings: {
          theme: 'dark',
          notifications: true
        }
      };
      const result = success(data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user.id).toBe('123');
        expect(result.data.user.profile.name).toBe('John Doe');
        expect(result.data.settings.theme).toBe('dark');
      }
    });

    it('should handle functions', () => {
      const data = (x: number) => x * 2;
      const result = success(data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data).toBe('function');
        expect(result.data(5)).toBe(10);
      }
    });
  });
});
