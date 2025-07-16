import { useState } from 'react';
import { validateEmail } from '../../utils/auth';

interface PasswordResetFormProps {
  onSuccess?: () => void;
  onBackToLogin?: () => void;
}

export default function PasswordResetForm({ onSuccess, onBackToLogin }: PasswordResetFormProps) {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    
    // Clear error when user starts typing
    if (errors.email) {
      setErrors(prev => ({
        ...prev,
        email: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      // TODO: Implement password reset functionality with Convex
      // For now, simulate the request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsSubmitted(true);
      onSuccess?.();
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to send reset email',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="auth-form">
        <h2>Check Your Email</h2>
        <div className="auth-form-content">
          <div className="success-message">
            We've sent a password reset link to <strong>{email}</strong>
          </div>
          <p className="auth-subtitle">
            Click the link in the email to reset your password. Don't see it? Check your spam folder.
          </p>
          
          <button
            type="button"
            className="auth-button secondary"
            onClick={onBackToLogin}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-form">
      <h2>Reset Password</h2>
      <p className="auth-subtitle">
        Enter your email address and we'll send you a link to reset your password.
      </p>
      
      <form onSubmit={handleSubmit} className="auth-form-content">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={handleInputChange}
            className={errors.email ? 'error' : ''}
            placeholder="Enter your email"
            disabled={isLoading}
          />
          {errors.email && <span className="error-message">{errors.email}</span>}
        </div>

        {errors.submit && (
          <div className="error-message submit-error">{errors.submit}</div>
        )}

        <button
          type="submit"
          className="auth-button primary"
          disabled={isLoading}
        >
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </button>

        <div className="auth-switch">
          Remember your password?{' '}
          <button
            type="button"
            className="auth-switch-button"
            onClick={onBackToLogin}
            disabled={isLoading}
          >
            Back to Sign In
          </button>
        </div>
      </form>
    </div>
  );
}