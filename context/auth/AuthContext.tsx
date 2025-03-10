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
      // Sprawdzamy, czy odpowiedź zawiera token i dane użytkownika
      if (response.data.token && response.data.user) {
        localStorage.setItem('token', response.data.token); // Przechowujemy token w localStorage
        setUser(response.data.user); // Ustawiamy dane użytkownika
      } else {
        console.error('Brak tokenu lub danych użytkownika w odpowiedzi:', response.data);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Zbiera więcej informacji o błędzie
        console.error('Błąd logowania:', error.response?.data || error.message);
        if (error.response) {
          console.error('Status HTTP:', error.response.status);
          console.error('Nagłówki odpowiedzi:', error.response.headers);
        }
      } else {
        console.error('Nieznany błąd logowania:', error);
      }
    }
  };
  
  
  // Funkcja wylogowania
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    console.log("logged out!");
    
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await axios.post('/api/auth/register', { name, email, password });
  
      if (response.data.token && response.data.user) {
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
      } else {
        console.error('Brak tokenu lub danych użytkownika w odpowiedzi:', response.data);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Błąd rejestracji:', error.response?.data || error.message);
      } else {
        console.error('Nieznany błąd rejestracji:', error);
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
