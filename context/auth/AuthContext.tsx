'use client';
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import axios from 'axios';


// Definicja typów
interface User {
  id: number;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<void>;
}

// Tworzymy kontekst autoryzacji
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Funkcja do używania AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Dostawca kontekstu (wrapping komponentu, który będzie dostępny w całej aplikacji)
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sprawdzamy, czy użytkownik jest zalogowany (np. w localStorage)
  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Możesz tutaj dodać zapytanie do swojego backendu, aby zweryfikować token
          const response = await axios.get('/api/auth/verify', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          // Jeśli token jest ważny, ustawiamy użytkownika
          if (response.data.user) {
            setUser(response.data.user);
          }
        } catch (error) {
          console.error('Błąd weryfikacji tokenu:', error);
        }
      }
      setLoading(false);
    };

    checkUser();
  }, []);

  // Funkcja logowania
  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      
      if (response.data.token && response.data.user) {
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
      } else {
        throw new Error('Nieprawidłowa odpowiedź serwera');
      }
    } catch (error) {
      console.error('Błąd logowania:', error);
      
      // ✅ DODAJ TO - rzuć błąd dalej do UI!
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 401) {
          // Nieprawidłowe credentials
          if (typeof data === 'string') {
            throw new Error(data);
          } else if (data?.message) {
            throw new Error(data.message); // "Niepoprawny adres e-mail lub hasło"
          } else {
            throw new Error('Nieprawidłowy email lub hasło');
          }
        } else if (status === 400) {
          // Błąd walidacji
          throw new Error(data?.message || 'Błędne dane logowania');
        } else if (status === 500) {
          throw new Error('Błąd serwera. Spróbuj ponownie później.');
        } else {
          throw new Error(`Błąd logowania: ${data?.message || 'Nieznany błąd'}`);
        }
      } else {
        // Network error
        throw new Error('Błąd połączenia. Sprawdź internet i spróbuj ponownie.');
      }
    }
  };
  
  
  // Funkcja wylogowania
  const logout = async () => {
    try {
      // Wywołaj endpoint wylogowywania na serwerze
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
  
      if (response.ok) {
        console.log("Wylogowano pomyślnie!");
  
        // Wyczyść stan użytkownika (jeśli używasz np. React Context, Redux, Zustand)
        setUser(null); // Zakładamy, że masz funkcję setUser do zarządzania stanem użytkownika
  
        // Przekieruj użytkownika na stronę logowania
        window.location.href = '/login';
      } else {
        console.error("Błąd podczas wylogowywania");
      }
    } catch (error) {
      console.error("Błąd podczas wylogowywania:", error);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await axios.post('/api/auth/register', { name, email, password });
  
      if (response.data.token && response.data.user) {
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
      } else {
        throw new Error('Brak tokenu lub danych użytkownika w odpowiedzi');
      }
    } catch (error) {
      console.error('Błąd rejestracji:', error);
      
      // ✅ DODAJ TO - rzuć błąd dalej do UI!
      if (axios.isAxiosError(error)) {
        // Jeśli backend zwrócił konkretny błąd
        if (error.response?.data?.message) {
          throw new Error(error.response.data.message); // np. "Adres e-mail jest już zajęty"
        } else {
          throw new Error(`Registration failed: ${error.response?.status || 'Network error'}`);
        }
      } else {
        throw new Error('Registration failed. Please try again.');
      }
    }
  };


  const value = {
    user,
    loading,  
    login,
    logout,
    register
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
