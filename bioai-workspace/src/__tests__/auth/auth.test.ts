import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword, getPasswordStrength } from '../../utils/auth';

describe('Authentication Utilities', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.email+tag@domain.co.uk')).toBe(true);
      expect(validateEmail('user123@test-domain.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('user@domain')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const result = validatePassword('StrongPass123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject weak passwords', () => {
      const shortPassword = validatePassword('Short1');
      expect(shortPassword.isValid).toBe(false);
      expect(shortPassword.errors).toContain('Password must be at least 8 characters long');

      const noUppercase = validatePassword('lowercase123');
      expect(noUppercase.isValid).toBe(false);
      expect(noUppercase.errors).toContain('Password must contain at least one uppercase letter');

      const noLowercase = validatePassword('UPPERCASE123');
      expect(noLowercase.isValid).toBe(false);
      expect(noLowercase.errors).toContain('Password must contain at least one lowercase letter');

      const noNumber = validatePassword('NoNumbersHere');
      expect(noNumber.isValid).toBe(false);
      expect(noNumber.errors).toContain('Password must contain at least one number');
    });
  });

  describe('getPasswordStrength', () => {
    it('should return weak for invalid passwords', () => {
      expect(getPasswordStrength('weak')).toBe('weak');
      expect(getPasswordStrength('12345')).toBe('weak');
    });

    it('should return medium for valid but basic passwords', () => {
      expect(getPasswordStrength('Password1')).toBe('medium');
    });

    it('should return strong for complex passwords', () => {
      expect(getPasswordStrength('StrongPassword123!')).toBe('strong');
      expect(getPasswordStrength('VeryLongAndComplexPassword456$')).toBe('strong');
    });
  });
});