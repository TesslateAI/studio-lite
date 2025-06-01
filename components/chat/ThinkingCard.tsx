// import { useState, useEffect } from 'react';
// import { ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// export function ThinkingCard({
//   seconds: initialSeconds,
//   stepsMarkdown,
//   running = true,
//   frozenSeconds
// }: {
//   seconds: number,
//   stepsMarkdown: string,
//   running?: boolean,
//   frozenSeconds?: number
// }) {
//   const [expanded, setExpanded] = useState(false);
//   const [seconds, setSeconds] = useState(initialSeconds);

//   useEffect(() => {
//     setSeconds(initialSeconds);
//     if (!running) return;
//     const interval = setInterval(() => {
//       setSeconds((s) => s + 1);
//     }, 1000);
//     return () => clearInterval(interval);
//   }, [initialSeconds, running]);

//   const displaySeconds = running ? seconds : (frozenSeconds ?? seconds);
//   const displayText = running
//     ? `Thinking for ${displaySeconds} seconds`
//     : `Thought for ${displaySeconds} seconds`;

//   return (
//     <div className="flex flex-col gap-2">
//       <div className="flex items-center gap-2 cursor-pointer" onClick={() => setExpanded(e => !e)}>
//         <span className={
//           `text-sm font-medium ${running ? 'animate-gradient-x' : 'text-black'}`
//         }>
//           {displayText}
//         </span>
//         <button
//           className="ml-2 text-zinc-400 hover:text-zinc-600 p-0 bg-transparent shadow-none border-none outline-none"
//           aria-label={expanded ? 'Hide steps' : 'Show steps'}
//         >
//           {expanded ? <ChevronUp /> : <ChevronDown />}
//         </button>
//       </div>
//       {expanded && (
//         <div className="mt-2 w-full text-left text-xs text-zinc-600">
//           <ReactMarkdown>{stepsMarkdown}</ReactMarkdown>
//         </div>
//       )}
//     </div>
//   );
// }

// Add this to your global CSS or Tailwind config:
// .animate-gradient-x {
//   background: linear-gradient(90deg, #ff9800, #ff9800 40%, #fff 60%, #ff9800 100%);
//   background-size: 200% auto;
//   animation: gradient-x 2s linear infinite;
//   color: transparent;
//   background-clip: text;
//   -webkit-background-clip: text;
//   -webkit-text-fill-color: transparent;
// }
// @keyframes gradient-x {
//   0% { background-position: 200% center; }
//   100% { background-position: -200% center; }
// }

// Minimal export: just output the think/stepsMarkdown if present
export function ThinkingCard({ stepsMarkdown }: { stepsMarkdown: string }) {
  if (!stepsMarkdown) return null;
  return <ReactMarkdown>{stepsMarkdown}</ReactMarkdown>;
} 