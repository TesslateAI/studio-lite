// components/chat/chat-sidebar.tsx
"use client"
import { useState } from "react"
import { ChevronLeft, Plus, Edit, Loader2, Trash2 } from "lucide-react"
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
  onDeleteChat?: (chatId: string) => void;
  activeChatId: string | null;
  getMessagesForChat?: (chatId: string) => any[];
  loadingChats?: Set<string>;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function ChatSidebar({ 
  chatHistory,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  activeChatId,
  getMessagesForChat,
  loadingChats = new Set(),
  isMobileOpen = false,
  onMobileClose
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
        <div className="group flex items-center w-full">
          <SidebarMenuButton 
            className={cn(
              "text-xs justify-start flex-1",
              activeChatId === chat.id && "bg-accent text-accent-foreground font-medium"
            )}
            onClick={() => onSelectChat(chat.id)}
          >
            <div className="flex items-center gap-2 w-full">
              <span className="truncate flex-1">{chat.title}</span>
              {loadingChats.has(chat.id) && (
                <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
              )}
            </div>
          </SidebarMenuButton>
          {onDeleteChat && (
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6 shrink-0 ml-1"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete "${chat.title}"?`)) {
                  onDeleteChat(chat.id);
                }
              }}
              title="Delete chat"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </SidebarMenuItem>
    ));
  };

  const canCreateNewChat = activeChatId && getMessagesForChat ? getMessagesForChat(activeChatId).length > 0 : true;

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}
      
      <Sidebar className={cn(
        "border-r border-border transition-all duration-300 relative bg-white z-50",
        collapsed ? "w-16" : "w-64",
        // Mobile styles
        "md:relative md:translate-x-0",
        isMobileOpen 
          ? "fixed left-0 top-0 h-full translate-x-0" 
          : "fixed left-0 top-0 h-full -translate-x-full md:translate-x-0"
      )}>
      <div className="flex items-center justify-between border-b gap-1 relative h-[3.5rem] px-2">
          {!collapsed && (
            <Button
              variant="outline"
              className="w-full justify-start gap-2 shadow-sm"
              onClick={onNewChat}
              aria-label="New chat"
              disabled={!canCreateNewChat}
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
              className="w-full px-3 py-1.5 rounded-md bg-background text-sm border focus:ring-2 focus:ring-[#5E62FF] focus:ring-offset-1 focus:ring-offset-background"
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
    </>
  )
}