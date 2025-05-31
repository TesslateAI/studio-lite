"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (email) {
      window.localStorage.setItem("signup_email", email)
      router.push(`/sign-up?email=${encodeURIComponent(email)}`)
    }
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          type="email"
          placeholder="Enter your personal or work email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl"
        />
        <Button type="submit" className="w-full bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl">Continue with email</Button>
      </form>
      <p className="text-xs text-zinc-500 mt-4 text-center">
        By continuing, you agree to Tesslate's{" "}
        <a href="#" className="text-zinc-700 hover:underline">
          Consumer Terms
        </a>{" "}
        and{" "}
        <a href="#" className="text-zinc-700 hover:underline">
          Usage Policy
        </a>
        , and acknowledge our{" "}
        <a href="#" className="text-zinc-700 hover:underline">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  )
} 