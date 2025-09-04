import { NextRequest } from 'next/server';
import {
  createPublicSupabaseClient,
  authenticateUser,
  successResponse,
  errorResponse,
  handleApiError,
  validateRequestBody,
} from '../api-utils';
import { ValidationError, AuthenticationError } from '@/shared/errors';

// Supabaseクライアントをモック
jest.mock('@/infrastructure/supabase/supabase.client', () => ({
  createServerSupabaseClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
  })),
}));

describe('API Utils', () => {
  describe('createPublicSupabaseClient', () => {
    it('should create a Supabase client', () => {
      const client = createPublicSupabaseClient();
      expect(client).toBeDefined();
      expect(client.auth).toBeDefined();
    });
  });

  describe('authenticateUser', () => {
    it('should throw AuthenticationError for missing authorization header', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      await expect(authenticateUser(request)).rejects.toThrow(AuthenticationError);
      await expect(authenticateUser(request)).rejects.toThrow('Authorization header missing or invalid');
    });

    it('should throw AuthenticationError for invalid authorization header format', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'InvalidFormat token123',
        },
      });

      await expect(authenticateUser(request)).rejects.toThrow(AuthenticationError);
      await expect(authenticateUser(request)).rejects.toThrow('Authorization header missing or invalid');
    });

    it('should throw AuthenticationError for empty token', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ',
        },
      });

      await expect(authenticateUser(request)).rejects.toThrow(AuthenticationError);
      await expect(authenticateUser(request)).rejects.toThrow('Authorization header missing or invalid');
    });
  });

  describe('successResponse', () => {
    it('should create success response with data', () => {
      const data = { id: '123', name: 'Test' };
      const response = successResponse(data);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/json');
    });

    it('should create success response with data and message', () => {
      const data = { id: '123', name: 'Test' };
      const message = 'Operation successful';
      const response = successResponse(data, message);

      expect(response.status).toBe(200);
    });

    it('should handle different data types', () => {
      const stringData = 'test string';
      const numberData = 123;
      const arrayData = [1, 2, 3];
      const objectData = { key: 'value' };

      expect(successResponse(stringData).status).toBe(200);
      expect(successResponse(numberData).status).toBe(200);
      expect(successResponse(arrayData).status).toBe(200);
      expect(successResponse(objectData).status).toBe(200);
    });
  });

  describe('errorResponse', () => {
    it('should create error response with default status code', () => {
      const response = errorResponse('Test error');

      expect(response.status).toBe(500);
    });

    it('should create error response with custom status code', () => {
      const response = errorResponse('Test error', 400);

      expect(response.status).toBe(400);
    });

    it('should handle different status codes', () => {
      const statusCodes = [400, 401, 403, 404, 500];
      
      statusCodes.forEach(statusCode => {
        const response = errorResponse('Test error', statusCode);
        expect(response.status).toBe(statusCode);
      });
    });
  });

  describe('handleApiError', () => {
    it('should handle ValidationError', () => {
      const error = new ValidationError('Invalid input');
      const response = handleApiError(error, 'Test');

      expect(response.status).toBe(400);
    });

    it('should handle AuthenticationError', () => {
      const error = new AuthenticationError('Invalid token');
      const response = handleApiError(error, 'Test');

      expect(response.status).toBe(401);
    });

    it('should handle generic Error', () => {
      const error = new Error('Generic error');
      const response = handleApiError(error, 'Test');

      expect(response.status).toBe(500);
    });

    it('should handle unknown error types', () => {
      const error = 'String error';
      const response = handleApiError(error, 'Test');

      expect(response.status).toBe(500);
    });

    it('should handle null/undefined errors', () => {
      const response1 = handleApiError(null, 'Test');
      const response2 = handleApiError(undefined, 'Test');

      expect(response1.status).toBe(500);
      expect(response2.status).toBe(500);
    });
  });

  describe('validateRequestBody', () => {
    const testSchema = {
      parse: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return parsed data for valid input', () => {
      const validData = { name: 'Test', email: 'test@example.com' };
      const parsedData = { name: 'Test', email: 'test@example.com' };
      
      testSchema.parse.mockReturnValue(parsedData);

      const result = validateRequestBody(validData, testSchema);

      expect(result).toEqual(parsedData);
      expect(testSchema.parse).toHaveBeenCalledWith(validData);
    });

    it('should throw ValidationError for invalid input', () => {
      const invalidData = { name: 'Test' }; // missing email
      
      testSchema.parse.mockImplementation(() => {
        throw new Error('Validation failed');
      });

      expect(() => validateRequestBody(invalidData, testSchema)).toThrow(ValidationError);
      expect(() => validateRequestBody(invalidData, testSchema)).toThrow('Invalid request body');
    });

    it('should handle different input types', () => {
      const inputs = [
        { name: 'Test' },
        'string input',
        123,
        [1, 2, 3],
        null,
        undefined,
      ];

      inputs.forEach(input => {
        testSchema.parse.mockReturnValue(input);
        
        const result = validateRequestBody(input, testSchema);
        expect(result).toBe(input);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete API flow with success', async () => {
      const data = { id: '123', name: 'Test' };
      const response = successResponse(data, 'Success');

      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual(data);
      expect(responseData.message).toBe('Success');
    });

    it('should handle complete API flow with error', () => {
      const error = new ValidationError('Invalid input');
      const response = handleApiError(error, 'API Test');

      expect(response.status).toBe(400);
    });

    it('should handle error response serialization', async () => {
      const response = errorResponse('Test error', 400);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Test error');
    });
  });
});
