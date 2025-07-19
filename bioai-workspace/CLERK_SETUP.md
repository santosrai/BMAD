# Clerk Authentication Setup

This project now uses Clerk for authentication instead of Convex Auth. Clerk provides a complete authentication solution with built-in UI components and handles all the complex backend setup automatically.

## Setup Steps

### 1. Create a Clerk Account
1. Go to [clerk.com](https://clerk.com)
2. Sign up for a free account
3. Create a new application

### 2. Get Your Publishable Key
1. In your Clerk dashboard, go to "API Keys"
2. Copy your "Publishable Key" (starts with `pk_test_` or `pk_live_`)

### 3. Set Environment Variables
Add this to your `.env.local` file:
```
VITE_CLERK_PUBLISHABLE_KEY="your_publishable_key_here"
```

### 4. Configure Authentication Methods
In your Clerk dashboard:
1. Go to "User & Authentication" → "Email, Phone, Username"
2. Enable "Email address" as a sign-up option
3. Enable "Password" as a sign-up option
4. Configure any additional settings as needed

### 5. Customize Appearance (Optional)
1. Go to "Appearance" in your Clerk dashboard
2. Customize colors, fonts, and branding to match your app
3. The Clerk components will automatically use your custom styling

## Features Included

- ✅ Email and password sign-up/sign-in
- ✅ Password reset functionality
- ✅ Email verification
- ✅ User profile management
- ✅ Session management
- ✅ Built-in UI components
- ✅ Responsive design
- ✅ Security best practices

## How It Works

1. **Sign Up**: Users enter email and password, Clerk handles verification
2. **Sign In**: Users enter email and password, Clerk validates credentials
3. **Profile**: Users can update their profile information through Clerk
4. **Security**: Clerk handles all security aspects (password hashing, session management, etc.)

## Benefits Over Convex Auth

- No need to generate PKCS#8 keys
- No need to configure email providers
- Built-in UI components
- Automatic security best practices
- Better user experience
- More reliable and tested

## Next Steps

1. Set up your Clerk account and get your publishable key
2. Add the environment variable
3. Test the sign-up and sign-in flow
4. Customize the appearance if needed

The app is now ready to use with Clerk authentication! 