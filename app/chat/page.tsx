'use client';
// This file should be moved to app/(dashboard)/chat/page.tsx for Next.js routing to work properly.

import Layout from '../(dashboard)/layout';
import { useState } from 'react';
import { Sandpack } from "@codesandbox/sandpack-react";
import { Plus, Search, ChevronLeft, ChevronRight, Bot, History, Settings } from 'lucide-react';

const models = ["GPT-4 Turbo", "GPT-4", "GPT-3.5 Turbo"];

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedModel, setSelectedModel] = useState(models[0]);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [fileName, setFileName] = useState("");
  const [code, setCode] = useState("");
  const [search, setSearch] = useState("");

  // Placeholder for chat history
  const chatHistory = [
    { id: 1, title: "Build a landing page" },
    { id: 2, title: "Create a blog" },
  ];

  return (
    <Layout>
      <div className="flex h-[calc(100vh-68px)] w-full bg-muted">
        {/* Sidebar */}
        <aside className={`transition-all duration-300 border-r bg-white dark:bg-zinc-900 ${sidebarOpen ? 'w-64' : 'w-16'} flex flex-col h-full shadow-sm`}>
          <div className="flex items-center justify-between p-3 border-b">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-black dark:text-zinc-400 dark:hover:text-white">
              {sidebarOpen ? <ChevronLeft size={20}/> : <ChevronRight size={20}/>}
            </button>
            {sidebarOpen && <span className="font-bold text-lg flex items-center gap-2"><Bot size={20}/> Chats</span>}
          </div>
          <div className="flex flex-col gap-2 p-3">
            <button className="flex items-center gap-2 bg-orange-500 text-white rounded px-3 py-2 font-medium hover:bg-orange-600 transition"><Plus size={16}/> {sidebarOpen && 'New Chat'}</button>
            {sidebarOpen && (
              <div className="relative">
                <Search className="absolute left-2 top-2.5 text-gray-400" size={16}/>
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 pr-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 w-full text-sm border-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            )}
            {sidebarOpen && (
              <select
                className="border rounded px-2 py-1 mt-2 bg-zinc-100 dark:bg-zinc-800 text-sm"
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
              >
                {models.map(m => <option key={m}>{m}</option>)}
              </select>
            )}
            <div className="mt-4 flex-1 overflow-y-auto">
              {sidebarOpen && <div className="font-semibold text-xs text-gray-500 mb-2 flex items-center gap-1"><History size={14}/> History</div>}
              <ul className="space-y-1">
                {chatHistory.filter(c => c.title.toLowerCase().includes(search.toLowerCase())).map(c => (
                  <li key={c.id} className="truncate text-sm text-gray-700 dark:text-zinc-200 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded px-2 py-1 flex items-center gap-2"><Bot size={14}/>{sidebarOpen && c.title}</li>
                ))}
              </ul>
            </div>
            {sidebarOpen && <button className="flex items-center gap-2 text-xs text-gray-500 hover:text-orange-600 mt-4"><Settings size={14}/> Settings</button>}
          </div>
        </aside>
        {/* Main chat and preview, resizable */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Chat area */}
          <div className={`flex-1 flex flex-col items-center justify-center p-8 min-w-[350px] max-w-[700px] border-r border-gray-200 resize-x overflow-auto bg-muted relative`}>
            <form
              className="w-full max-w-xl mx-auto flex flex-col items-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              onSubmit={e => {
                e.preventDefault();
                setGenerating(true);
                setFileName("app/page.tsx");
                setTimeout(() => {
                  setCode(`export default function Home() {\n  return <div>Hello Coffee Shop!</div>;\n}`);
                  setGenerating(false);
                }, 2000);
              }}
            >
              <input
                type="text"
                className="w-full border-none rounded-full px-6 py-4 text-lg shadow mb-4 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-orange-500"
                placeholder="Ask anything..."
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                disabled={generating}
                autoFocus
              />
              <button
                type="submit"
                className="bg-black text-white px-6 py-2 rounded-full font-semibold shadow hover:bg-zinc-800 transition"
                disabled={generating || !prompt.trim()}
              >
                {generating ? 'Generating...' : 'Send'}
              </button>
            </form>
            {generating && (
              <div className="mt-32 text-center text-gray-700 text-lg">Generating <span className="font-mono">{fileName}</span>...</div>
            )}
          </div>
          {/* Sandpack preview, only show when code is generated */}
          {code && (
            <div className="flex-1 min-w-[350px] max-w-[900px] p-8 overflow-auto bg-white dark:bg-zinc-900 border-l border-gray-200">
              <Sandpack
                template="react"
                files={{
                  "/App.js": code,
                }}
                options={{
                  showNavigator: true,
                  showTabs: true,
                  showLineNumbers: true,
                  editorHeight: 400,
                  editorWidthPercentage: 60,
                }}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
} 