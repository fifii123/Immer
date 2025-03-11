// components/ProtectedRoute.tsx
"use client"; // Komponent musi być po stronie klienta

import { useAuth } from "@/context/auth/AuthContext"; // Importujemy useAuth
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth(); // Pobieramy użytkownika i stan ładowania z AuthContext
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      // Jeśli użytkownik nie jest zalogowany i ładowanie zostało zakończone, przekieruj na stronę logowania
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    // Możesz zwrócić loader podczas weryfikacji autoryzacji
    return <p>Loading...</p>;
  }

  // Jeśli użytkownik jest zalogowany, zwróć dzieci
  return <>{children}</>;
}