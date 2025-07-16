import { useState, useEffect } from 'react';
// import { useMutation } from 'convex/react';
// import { api } from '../../../convex/_generated/api';
import { useUserProfile } from '../../hooks/useAuth';
import { validateEmail } from '../../utils/auth';

export default function ProfilePage() {
  const profile = useUserProfile();
  // TODO: Replace with actual mutation once Convex is deployed
  // const updateProfile = useMutation(api.users.updateProfile);
  const updateProfile = async () => { throw new Error("Profile update not implemented yet"); };
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
      });
    }
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error and success message when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
    if (successMessage) {
      setSuccessMessage('');
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
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
      await updateProfile();
      
      setSuccessMessage('Profile updated successfully!');
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to update profile',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="loading">Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h1>Profile Settings</h1>
        
        <div className="profile-info">
          <div className="profile-meta">
            <p><strong>Member since:</strong> {new Date(profile._creationTime).toLocaleDateString()}</p>
            <p><strong>Email verification:</strong> {profile.emailVerified ? 'Verified' : 'Pending'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={errors.name ? 'error' : ''}
              placeholder="Enter your full name"
              disabled={isLoading}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
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

          {successMessage && (
            <div className="success-message">{successMessage}</div>
          )}

          <button
            type="submit"
            className="profile-button primary"
            disabled={isLoading}
          >
            {isLoading ? 'Updating...' : 'Update Profile'}
          </button>
        </form>

        {!profile.emailVerified && (
          <div className="email-verification-notice">
            <h3>Email Verification Required</h3>
            <p>Please check your email and click the verification link to complete your account setup.</p>
          </div>
        )}
      </div>
    </div>
  );
}