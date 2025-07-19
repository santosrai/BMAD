import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'

console.log('Environment Variables:', {
  VITE_CONVEX_URL: import.meta.env.VITE_CONVEX_URL,
  VITE_CLERK_PUBLISHABLE_KEY: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ? 'Found' : 'Missing'
});

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL || "")
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// Check for required environment variables
if (!clerkPublishableKey) {
  console.error("Missing VITE_CLERK_PUBLISHABLE_KEY environment variable");
  console.error("Please create a .env.local file with your Clerk publishable key");
  console.error("See CLERK_SETUP.md for setup instructions");
  
  // Show a user-friendly error message instead of crashing
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto;">
        <h1>Configuration Error</h1>
        <p>Missing required environment variables. Please:</p>
        <ol>
          <li>Create a <code>.env.local</code> file in the project root</li>
          <li>Add your Clerk publishable key: <code>VITE_CLERK_PUBLISHABLE_KEY="your_key_here"</code></li>
          <li>Add your Convex URL: <code>VITE_CONVEX_URL="your_convex_url_here"</code></li>
          <li>Restart the development server</li>
        </ol>
        <p>See <code>CLERK_SETUP.md</code> for detailed setup instructions.</p>
      </div>
    `;
  }
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <ClerkProvider publishableKey={clerkPublishableKey}>
          <ConvexProvider client={convex}>
            <App />
          </ConvexProvider>
        </ClerkProvider>
      </ErrorBoundary>
    </StrictMode>,
  )
}
