// components/chat/chat-sidebar.tsx
"use client"
import { useState } from "react"
import { ChevronLeft, Plus, Edit } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar"
import { cn } from "@/lib/utils"
import { Button } from "../ui/button"

type Category = "Today" | "Yesterday" | "Last 7 Days" | "Last 30 Days" | "Older"

type ChatHistoryItem = {
  id: string
  title: string
  category: Category
}

interface ChatSidebarProps {
  chatHistory: ChatHistoryItem[]
  onNewChat?: () => void
  onSelectChat: (chatId: string) => void;
  activeChatId: string | null;
}

export function ChatSidebar({ 
  chatHistory,
  onNewChat,
  onSelectChat,
  activeChatId
}: ChatSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [search, setSearch] = useState("")

  const filteredHistory = chatHistory.filter(chat =>
    chat.title.toLowerCase().includes(search.toLowerCase())
  );
  
  const groupedHistory = filteredHistory.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    },
    {} as Record<Category, ChatHistoryItem[]>,
  )

  const categoryOrder: Category[] = ["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "Older"];

  const renderChatItems = (items: ChatHistoryItem[]) => {
    return items.map((chat) => (
      <SidebarMenuItem key={chat.id}>
        <SidebarMenuButton 
          className={cn(
            "text-xs justify-start w-full",
            activeChatId === chat.id && "bg-accent text-accent-foreground font-medium"
          )}
          onClick={() => onSelectChat(chat.id)}
        >
          <span className="truncate">{chat.title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));
  };

  return (
    <Sidebar className={cn("border-r border-border transition-all duration-300 relative bg-secondary/50", collapsed ? "w-16" : "w-64") }>
      <div className="flex items-center justify-between border-b gap-1 relative h-[3.5rem] px-2">
          {!collapsed && (
            <Button
              variant="outline"
              className="w-full justify-start gap-2 shadow-sm"
              onClick={onNewChat}
              aria-label="New chat"
            >
              <Edit className="w-4 h-4" />
              New Chat
            </Button>
          )}
          <button
            className={cn("p-2 rounded-full hover:bg-muted", collapsed && "mx-auto")}
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft className={cn("w-5 h-5 transition-transform", collapsed ? "rotate-180" : "")}/>
          </button>
      </div>

      {!collapsed && (
        <>
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Search history..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 rounded-md bg-background text-sm border focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 focus:ring-offset-background"
            />
          </div>
          <SidebarContent className="p-2">
            {filteredHistory.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No chat history found.
              </div>
            ) : (
              categoryOrder.map(category => (
                groupedHistory[category] && groupedHistory[category].length > 0 && (
                  <SidebarGroup key={category}>
                    <SidebarGroupLabel>{category}</SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {renderChatItems(groupedHistory[category])}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                )
              ))
            )}
          </SidebarContent>
        </>
      )}
    </Sidebar>
  )
}