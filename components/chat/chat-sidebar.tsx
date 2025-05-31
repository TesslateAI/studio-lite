"use client"
import { useState } from "react"
import { MessageSquare, ChevronLeft, Plus } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar"
import { cn } from "@/lib/utils"

type ChatHistoryItem = {
  id: string
  title: string
  date: string
  category: "today" | "yesterday" | "older"
}

type UserPlan = "free" | "pro"

interface ChatSidebarProps {
  chatHistory: ChatHistoryItem[]
  userPlan: UserPlan
  onNewChat?: () => void
}

export function ChatSidebar({ chatHistory, userPlan = "free", onNewChat }: ChatSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [search, setSearch] = useState("")
  // Group chat history by category
  const groupedHistory = chatHistory.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, ChatHistoryItem[]>,
  )

  const handleNewChat = () => {
    if (onNewChat) onNewChat();
  }

  return (
    <Sidebar className={cn("border-r border-border transition-all duration-200 relative", collapsed ? "w-14" : "w-64") }>
      <div className="flex items-center border-b gap-1 relative h-14">
        <div className="flex items-center gap-1 flex-1">
          {!collapsed && (
            <button
              className={cn("flex items-center justify-center p-2 rounded hover:bg-muted transition gap-2 px-2 py-2")}
              onClick={handleNewChat}
              aria-label="New chat"
            >
              <Plus className="w-5 h-5" />
              <span className="text-xs font-medium">New Chat</span>
            </button>
          )}
        </div>
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={cn("w-5 h-5 transition-transform", collapsed ? "rotate-180" : "")}/>
        </button>
      </div>
      {!collapsed && (
        <div className="px-2 py-2 border-b">
          <input
            type="text"
            placeholder="Search chats..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-xs border-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      )}
      <SidebarContent>
        {/* Today's Chats */}
        {groupedHistory.today && groupedHistory.today.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={cn(collapsed && "hidden")}>Today</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {groupedHistory.today
                  .filter(chat => chat.title.toLowerCase().includes(search.toLowerCase()))
                  .map((chat) => (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton className={cn("text-xs", collapsed && "justify-center px-0") }>
                      {/* Removed chat icon for cleaner look */}
                      {!collapsed && <span>{chat.title}</span>}
                      {collapsed && <span className="sr-only">{chat.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {/* Yesterday's Chats */}
        {groupedHistory.yesterday && groupedHistory.yesterday.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={cn(collapsed && "hidden")}>Yesterday</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {groupedHistory.yesterday
                  .filter(chat => chat.title.toLowerCase().includes(search.toLowerCase()))
                  .map((chat) => (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton className={cn("text-xs", collapsed && "justify-center px-0") }>
                      {/* Removed chat icon for cleaner look */}
                      {!collapsed && <span>{chat.title}</span>}
                      {collapsed && <span className="sr-only">{chat.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {/* Older Chats */}
        {groupedHistory.older && groupedHistory.older.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={cn(collapsed && "hidden")}>Older</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {groupedHistory.older
                  .filter(chat => chat.title.toLowerCase().includes(search.toLowerCase()))
                  .map((chat) => (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton className={cn("text-xs", collapsed && "justify-center px-0") }>
                      {/* Removed chat icon for cleaner look */}
                      {!collapsed && <span>{chat.title}</span>}
                      {collapsed && <span className="sr-only">{chat.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-border p-3">
        <div className={cn("flex items-center gap-2 justify-center") }>
          {collapsed ? (
            <span
              className={cn(
                "inline-block w-2 h-2 rounded-full",
                userPlan === "pro" ? "bg-green-500" : "bg-gray-400"
              )}
            />
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200",
                userPlan === "pro"
                  ? "bg-green-100 text-green-800 border border-green-200"
                  : "bg-gray-100 text-gray-700 border border-gray-200"
              )}
            >
              <span
                className={cn(
                  "inline-block w-2 h-2 rounded-full mr-1",
                  userPlan === "pro" ? "bg-green-500" : "bg-gray-400"
                )}
              />
              {userPlan === "pro" ? "Pro Plan" : "Free Plan"}
            </span>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  )
} 