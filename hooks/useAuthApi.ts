'use client';
import { useAuth } from "@/context/auth/AuthContext";

export function useUserId() {
  const auth = useAuth();
  const userId = auth?.user?.id;
  
  return userId;
}