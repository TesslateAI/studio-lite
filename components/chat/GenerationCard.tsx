import React from 'react';

// Only render this card when actually generating an artifact, not for every LLM response.
export function GenerationCard({ onOpenArtifact }: { onOpenArtifact: () => void }) {
  return (
    <div
      className="flex items-center justify-between cursor-pointer"
      onClick={onOpenArtifact}
    >
      <span className="text-sm font-medium bg-gradient-to-r from-orange-400 via-black to-orange-400 bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-x">
      </span>
    </div>
  );
}

// Add this to your global CSS or Tailwind config:
// .animate-gradient-x {
//   background-size: 200% auto;
//   animation: gradient-x 2s linear infinite;
// }
// @keyframes gradient-x {
//   0% { background-position: 200% center; }
//   100% { background-position: -200% center; }
// } 