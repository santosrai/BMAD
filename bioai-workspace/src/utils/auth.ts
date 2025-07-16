export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  
  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  const { isValid } = validatePassword(password);
  
  if (!isValid) return 'weak';
  
  let score = 1; // Base score for meeting minimum requirements
  
  // Length bonus
  if (password.length >= 12) score += 2;
  else if (password.length >= 10) score += 1;
  
  // Special characters
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  
  if (score >= 4) return 'strong';
  if (score >= 2) return 'medium';
  return 'medium'; // Changed from 'weak' since any valid password should be at least medium
}