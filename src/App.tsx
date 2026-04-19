import * as React from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import AppRouter from './AppRouter';
import { useAuthSync } from './hooks/useAuthSync';

/**
 * App Component
 * 
 * Responsibilities:
 * 1. Initialize authentication sync via custom hook.
 * 2. Wrap the application with ErrorBoundary.
 * 3. Mount the AppRouter for navigation handling.
 */
export default function App() {
  const authProps = useAuthSync();

  return (
    <ErrorBoundary>
      <AppRouter {...authProps} />
    </ErrorBoundary>
  );
}
