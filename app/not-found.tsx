"use client"

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function NotFound() {
  const [imgSrc, setImgSrc] = useState("/44959608-1a8b-4b19-8b7a-5172b49f8fbc.png");

  useEffect(() => {
    const img = new window.Image();
    img.src = "/44959608-1a8b-4b19-8b7a-5172b49f8fbc.png";
    img.onerror = () => setImgSrc("/Asset_108x.png");
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[100dvh]">
      <div className="max-w-md space-y-8 p-4 text-center">
        <div className="flex justify-center">
          <Image
            src={imgSrc}
            alt="Tesslate Logo"
            width={48}
            height={48}
            priority
          />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
          Page Not Found
        </h1>
        <p className="text-base text-gray-500">
          The page you are looking for might have been removed, had its name
          changed, or is temporarily unavailable.
        </p>
        <Link
          href="/"
          className="max-w-48 mx-auto flex justify-center py-2 px-4 border border-gray-300 rounded-full shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5E62FF]"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
