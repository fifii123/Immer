'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/auth/AuthContext"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false) // Local state for loading
  const router = useRouter()
  const { register } = useAuth();  // Assuming register function handles user registration

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true) // Start loading animation

    if (!name || !email || !password || !repeatPassword) {
      setError("Please fill in all fields")
      setLoading(false) // Stop loading animation
      return
    }

    if (password !== repeatPassword) {
      setError("Passwords do not match")
      setLoading(false) // Stop loading animation
      return
    }

    try {
      await register(name, email, password) // Assuming this is an async function
      router.push("/") // Redirect after successful registration
    } catch (err) {
      setError("Registration failed. Please try again.")
    } finally {
      setLoading(false) // Stop loading animation regardless of success or failure
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
          <CardTitle className="text-2xl font-bold text-center dark:text-white">Sign up</CardTitle>
          <CardDescription className="text-center dark:text-slate-400">
            Create an account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="dark:text-white">Name</Label>
              <Input 
                id="name" 
                type="text" 
                placeholder="Your name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
              />
            </div>
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
              <Label htmlFor="password" className="dark:text-white">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repeatPassword" className="dark:text-white">Repeat Password</Label>
              <Input 
                id="repeatPassword" 
                type="password" 
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            
            {/* Button with loading animation */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <div className="spinner-border animate-spin border-2 border-t-2 border-t-blue-500 border-blue-300 rounded-full w-5 h-5"></div>
              ) : (
                "Sign up"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground dark:text-slate-400">
            Already have an account?{" "}
            <Button 
              variant="link" 
              className="px-0 font-normal h-auto dark:text-blue-400" 
              type="button"
              onClick={() => router.push("/login")}
            >
              Sign in
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
