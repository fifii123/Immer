'use client';
import React from 'react';
import { useAuth } from '../context/auth/AuthContext';
import { useRouter } from 'next/navigation';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return <div>Loading...</div>;  // Możesz dodać spinner lub inne animacje ładowania
  }

  if (!user) {
    // Jeśli nie ma użytkownika, przekierowujemy na stronę logowania
    router.push('/login');
    return null;
  }

  return <>{children}</>;  // Jeśli użytkownik jest zalogowany, renderujemy dzieci
};

export default ProtectedRoute;
