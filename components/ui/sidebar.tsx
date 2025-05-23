"use client"
import * as React from "react"

export function Sidebar({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <aside className={`flex flex-col h-full bg-background ${className}`} {...props} />
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SidebarContent({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex-1 overflow-y-auto ${className}`} {...props} />
}

export function SidebarFooter({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <footer className={`mt-auto ${className}`} {...props} />
}

export function SidebarGroup({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`mb-4 ${className}`} {...props} />
}

export function SidebarGroupLabel({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`text-xs font-semibold text-muted-foreground px-4 py-2 ${className}`} {...props} />
}

export function SidebarGroupContent({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`pl-2 ${className}`} {...props} />
}

export function SidebarMenu({ className = '', ...props }: React.HTMLAttributes<HTMLUListElement>) {
  return <ul className={`flex flex-col gap-1 ${className}`} {...props} />
}

export function SidebarMenuItem({ className = '', ...props }: React.LiHTMLAttributes<HTMLLIElement>) {
  return <li className={className} {...props} />
}

export function SidebarMenuButton({ className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`flex items-center gap-2 w-full px-3 py-2 rounded hover:bg-muted transition text-left ${className}`} {...props} />
} 