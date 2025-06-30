// components/chat/chat-input.tsx
'use client';

import { ArrowUp, Loader2, Square, RefreshCw, ChevronDown, Image as ImageIcon, File as FileIcon, Box as BoxIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { cn } from '@/lib/utils';

// --- Hardcoded Prompts ---
const PROMPTS_BY_CATEGORY = {
  "Default": [
    "Create a login form with a password strength indicator.",
    "Design a dashboard for a project management tool.",
    "Generate a landing page for a new SaaS product.",
    "Build a responsive navigation bar with a dropdown menu."
  ],
  "Components": [
    "A responsive card component for a blog post.",
    "A customizable button with primary, secondary, and disabled states.",
    "A modal dialog for confirming a user action.",
    "A data table with sorting and pagination.",
  ],
  "Pages": [
    "A modern e-commerce product detail page with image gallery.",
    "A clean and simple 'About Us' page for a startup.",
    "A user profile page with editable fields.",
    "A 404 'Not Found' page with a creative illustration.",
  ],
  "Forms": [
    "A multi-step checkout form for an online store.",
    "A user registration form with real-time validation feedback.",
    "A contact form with fields for name, email, and message.",
    "A settings page form with toggle switches and input fields.",
  ],
  "Dashboards": [
    "A financial dashboard with charts for income and expenses.",
    "A social media analytics dashboard showing key metrics.",
    "An e-commerce admin dashboard with recent orders and sales data.",
    "A project management dashboard with a Kanban board view.",
  ],
};

type FilterCategory = keyof typeof PROMPTS_BY_CATEGORY;

// --- Props Interface (unchanged) ---
interface ChatInputProps {
  retry: () => void;
  isErrored: boolean;
  errorMessage: string;
  isLoading: boolean;
  isRateLimited: boolean;
  stop: () => void;
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement> | { target: { value: string } }) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
  isGuest?: boolean;
  guestMessageCount?: number;
  guestMessageLimit?: number;
  onSignUp?: () => void;
  selectedModel?: string;
}

// --- Component ---
export function ChatInput({
  retry,
  isErrored,
  errorMessage,
  isLoading,
  stop,
  input,
  handleInputChange,
  handleSubmit,
  children,
  isGuest,
  guestMessageCount = 0,
  guestMessageLimit = 10,
}: ChatInputProps) {
  const [isInspirationOpen, setIsInspirationOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("Default");
  const [displayPrompts, setDisplayPrompts] = useState(PROMPTS_BY_CATEGORY["Default"]);

  const inspirationPanelRef = useRef<HTMLDivElement>(null);
  const inspirationBtnRef = useRef<HTMLButtonElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inspirationPanelRef.current && !inspirationPanelRef.current.contains(event.target as Node) && inspirationBtnRef.current && !inspirationBtnRef.current.contains(event.target as Node)) {
        setIsInspirationOpen(false);
      }
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node) && addBtnRef.current && !addBtnRef.current.contains(event.target as Node)) {
        setIsAddMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { if (!isLoading) inputRef.current?.focus(); }, [isLoading]);

  const handleSuggestionClick = (suggestion: string) => {
    handleInputChange({ target: { value: suggestion } });
    setIsInspirationOpen(false);
    inputRef.current?.focus();
  };
  
  const handleFilterClick = (filter: FilterCategory) => {
    setActiveFilter(filter);
    setDisplayPrompts(PROMPTS_BY_CATEGORY[filter]);
  };

  const handleSurpriseMe = () => {
    const randomIndex = Math.floor(Math.random() * displayPrompts.length);
    handleSuggestionClick(displayPrompts[randomIndex]);
  };

  const handleComingSoonClick = (feature: string) => {
    alert(`${feature} support is coming soon!`);
    setIsAddMenuOpen(false);
  };

  const isSubmitDisabled = isLoading || !input.trim() || isErrored || (isGuest && guestMessageCount >= guestMessageLimit);

  const onEnter = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        if (isSubmitDisabled) return;
        handleSubmit(e as any);
    }
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Floating Inspiration Panel */}
      <div 
        ref={inspirationPanelRef} 
        className={cn(
          "absolute bottom-full left-0 right-0 mb-4 bg-white rounded-3xl p-6 shadow-xl border z-50 transition-all duration-300 ease-out",
          isInspirationOpen 
            ? "opacity-100 translate-y-0 pointer-events-auto" 
            : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        <ul className="space-y-4 mb-6 text-gray-700 text-sm md:text-base">
          {displayPrompts.map((prompt, index) => (
            <li key={`${activeFilter}-${index}`} onClick={() => handleSuggestionClick(prompt)} className="cursor-pointer hover:text-black transition-colors duration-200">{prompt}</li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-2 text-sm">
            <button type="button" onClick={handleSurpriseMe} className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-full flex items-center gap-2 transition-colors duration-200">
                Surprise me <RefreshCw className="w-4 h-4" />
            </button>
            {(Object.keys(PROMPTS_BY_CATEGORY) as FilterCategory[]).filter(f => f !== "Default").map(filter => (
               <button type="button" key={filter} onClick={() => handleFilterClick(filter)} className={cn("text-gray-800 font-medium py-2 px-4 rounded-full transition-colors duration-200", activeFilter === filter ? 'bg-gray-300' : 'bg-gray-100 hover:bg-gray-200')}>{filter}</button>
            ))}
        </div>
      </div>
      
      <form onSubmit={handleSubmit} onKeyDown={onEnter} className="flex flex-col gap-3">
        {isErrored && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-2xl relative flex justify-between items-center" role="alert">
                <span className="block sm:inline">{errorMessage}</span>
                <button type="button" onClick={retry} className="ml-4 px-3 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">Retry</button>
            </div>
        )}
        
        <div className="bg-white rounded-3xl shadow-lg p-2.5 flex flex-col gap-3">
        <div className="px-2 pt-2">
            <TextareaAutosize
                id="prompt-input" ref={inputRef} rows={1} maxRows={10}
                className="w-full text-gray-800 bg-transparent resize-none outline-none placeholder-gray-500 text-base"
                placeholder={isGuest && guestMessageCount >= guestMessageLimit ? 'Please sign up to continue.' : 'Describe your component, page, or scene...'}
                value={input} onChange={handleInputChange} disabled={isGuest && guestMessageCount >= guestMessageLimit}
            />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <button ref={addBtnRef} onClick={() => setIsAddMenuOpen(p => !p)} id="add-button" title="Add files" type="button" className="flex items-center justify-center h-10 w-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              </button>
              <div ref={addMenuRef} className={cn("absolute bottom-full left-0 mb-2 w-56 bg-white rounded-xl shadow-lg p-2 fade-in-out", !isAddMenuOpen && "hidden-panel")}>
                <a href="#" onClick={() => handleComingSoonClick('Figma')} className="flex items-center gap-3 px-3 py-2 text-gray-700 text-sm hover:bg-gray-100 rounded-lg transition-colors duration-200">
                    <ImageIcon className="h-5 w-5 text-gray-500" /> <span>Import from Figma</span>
                </a>
                <a href="#" onClick={() => handleComingSoonClick('3D object')} className="flex items-center gap-3 px-3 py-2 text-gray-700 text-sm hover:bg-gray-100 rounded-lg transition-colors duration-200">
                    <BoxIcon className="h-5 w-5 text-gray-500" /> <span>Add 3D objects</span>
                </a>
                <a href="#" onClick={() => handleComingSoonClick('File')} className="flex items-center gap-3 px-3 py-2 text-gray-700 text-sm hover:bg-gray-100 rounded-lg transition-colors duration-200">
                    <FileIcon className="h-5 w-5 text-gray-500" /> <span>Add files (docs, etc)</span>
                </a>
              </div>
            </div>
            <button ref={inspirationBtnRef} onClick={() => setIsInspirationOpen(p => !p)} id="inspiration-button" type="button" className="flex items-center gap-2 h-10 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 pl-3 pr-4 rounded-lg transition-colors duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                <span className="text-sm md:text-base">Inspiration</span>
                <ChevronDown className={cn("h-4 w-4 text-gray-500 transition-transform", isInspirationOpen && "rotate-180")} />
            </button>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <div className="flex items-center gap-2 h-10 text-gray-800 font-medium py-2 px-2 md:px-3 rounded-lg hover:bg-gray-100 transition-colors duration-200 text-sm md:text-base">
              {children}
            </div>
            {isLoading ? (
              <button type="button" onClick={stop} title="Stop generation" className="flex items-center justify-center h-10 w-10 bg-gray-800 text-white hover:bg-black rounded-lg transition-colors duration-200 animate-pulse">
                  <Square className="h-5 w-5" />
              </button>
            ) : (
              <button id="submit-button" title="Generate" type="submit" disabled={isSubmitDisabled}
                  className={cn("flex items-center justify-center h-10 w-10 rounded-lg transition-colors duration-200", isSubmitDisabled ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-800 text-white hover:bg-black')}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m-7 7l7-7 7 7" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>
      </form>
    </div>
  );
}