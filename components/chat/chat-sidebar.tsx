// components/chat/chat-sidebar.tsx
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

interface ChatSidebarProps {
  chatHistory: ChatHistoryItem[]
  userPlanName: string | undefined
  onNewChat?: () => void
  isLoadingPlan?: boolean
  onSelectChat: (chatId: string) => void; // Added prop
  activeChatId: string | null; // Added prop
}

export function ChatSidebar({ 
  chatHistory, 
  userPlanName, 
  onNewChat, 
  isLoadingPlan = false,
  onSelectChat, // Destructure new prop
  activeChatId   // Destructure new prop
}: ChatSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [search, setSearch] = useState("")
  
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

  const getPlanDisplayInfo = (planName: string | undefined) => {
    if (isLoadingPlan) return { display: "Loading...", isPro: false, isPlus: false };

    switch (planName) {
      case "Pro":
        return { display: "Pro", isPro: true, isPlus: false };
      case "Plus":
        return { display: "Plus", isPro: false, isPlus: true };
      default:
        return { display: "Free Plan", isPro: false, isPlus: false };
    }
  };

  const planInfo = getPlanDisplayInfo(userPlanName);

  const renderChatItems = (items: ChatHistoryItem[]) => {
    return collapsed ? null : items
      .filter(chat => chat.title.toLowerCase().includes(search.toLowerCase()))
      .map((chat) => (
      <SidebarMenuItem key={chat.id}>
        <SidebarMenuButton 
          className={cn(
            "text-xs", 
            collapsed && "justify-center px-0",
            activeChatId === chat.id && "bg-accent text-accent-foreground font-medium" // Active chat styling
          )}
          onClick={() => onSelectChat(chat.id)} // Call onSelectChat
        >
          <span>{chat.title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));
  };

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
      {!collapsed && (
        <SidebarContent>
          {Object.keys(groupedHistory).length === 0 && (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No chat history yet. <br/>Start a new conversation!
            </div>
          )}
          {groupedHistory.today && groupedHistory.today.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>Today</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {renderChatItems(groupedHistory.today)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
          {groupedHistory.yesterday && groupedHistory.yesterday.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>Yesterday</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {renderChatItems(groupedHistory.yesterday)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
          {groupedHistory.older && groupedHistory.older.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>Older</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {renderChatItems(groupedHistory.older)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
      )}
      <SidebarFooter className="border-t border-border p-3">
        <div className={cn("flex items-center gap-2 justify-center") }>
          {collapsed ? (
             isLoadingPlan ? (
                <div className="w-2 h-2 rounded-full bg-gray-200 animate-pulse"></div>
             ) : (
                 <span
                     className={cn(
                         "inline-block w-2 h-2 rounded-full",
                         planInfo.isPro ? "bg-green-500" :
                             planInfo.isPlus ? "bg-blue-500" : "bg-gray-400"
                     )}
                     title={planInfo.display}
                 />
             )
          ) : (
            <span
                className={cn(
                    "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200",
                    isLoadingPlan
                        ? "bg-gray-100 text-gray-700 border border-gray-200"
                        : planInfo.isPro
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : planInfo.isPlus
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : "bg-gray-100 text-gray-700 border border-gray-200"
                )}
            >
                {isLoadingPlan ? (
                    <div className="w-2 h-2 rounded-full bg-gray-200 animate-pulse mr-1"></div>
                ) : (
                    <span
                        className={cn(
                            "inline-block w-2 h-2 rounded-full mr-1",
                            planInfo.isPro ? "bg-green-500" :
                                planInfo.isPlus ? "bg-blue-500" : "bg-gray-400"
                        )}
                    />
                )}
              {planInfo.display}
            </span>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}