'use client'

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card"
import { useAuth } from "@/context/auth/AuthContext"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  // Pobieramy parametr redirectTo z URL
  const redirectTo = searchParams.get('redirectTo') || "/"
  
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    // Prosta walidacja
    if (!email || !password) {
      setError("Please enter both email and password")
      setLoading(false)
      return
    }

    try {
      await login(email, password)
      
      // Kluczowa zmiana: przekierowanie do strony na którą użytkownik próbował wejść
      // Dodajemy setTimeout, aby dać przeglądarce czas na zapisanie ciasteczka
      setTimeout(() => {
        router.push(redirectTo)
      }, 100)
    } catch (err) {
      setError("Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md dark:border-slate-700 dark:bg-slate-900">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center gap-1 mb-2">
            <div className="bg-red-500 text-white px-1 rounded">
              <span className="font-semibold">Im</span>
            </div>
            <span className="text-xl font-serif">Immer.</span>
          </div>

          <CardDescription className="text-center dark:text-slate-400">
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="dark:text-white">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="dark:text-white">Password</Label>
                <Button variant="link" className="px-0 font-normal h-auto dark:text-blue-400" type="button">
                  Forgot password?
                </Button>
              </div>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            
            {/* Przycisk z animacją ładowania */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <div className="spinner-border animate-spin border-2 border-t-2 border-t-blue-500 border-blue-300 rounded-full w-5 h-5"></div>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground dark:text-slate-400">
            Don't have an account?{" "}
            <Button 
              variant="link" 
              className="px-0 font-normal h-auto dark:text-blue-400" 
              type="button"
              onClick={() => router.push("/register")}
            >
              Sign up
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}