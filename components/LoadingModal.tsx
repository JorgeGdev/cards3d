"use client";
import React from "react";
import Image from "next/image";

export default function LoadingModal({ 
  open, 
  message = "Generating your amazing image..." 
}: { 
  open: boolean; 
  message?: string; 
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal card */}
      <div className="relative z-10 rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl max-w-md w-full">
        <div className="text-center">
          {/* Animated spinner */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-white/20 rounded-full animate-spin border-t-white"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-pulse border-t-white/50"></div>
            </div>
          </div>

          {/* Cute animation */}
          <div className="mb-4 text-6xl animate-bounce">
            🎨
          </div>

          {/* Message */}
          <h3 className="text-xl font-semibold text-white mb-2">
            Creating Magic
          </h3>
          <p className="text-white/80 text-sm mb-4">
            {message}
          </p>

          {/* Progress dots */}
          <div className="flex justify-center space-x-2">
            <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse delay-100"></div>
            <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse delay-200"></div>
          </div>

          {/* Fun rotating card icons */}
          <div className="mt-6 flex justify-center space-x-4">
            <div className="w-8 h-8 animate-spin opacity-80">
              <Image src="/assets/images/back1.png" alt="" width={32} height={32} className="rounded-sm" />
            </div>
            <div className="w-8 h-8 animate-pulse opacity-60">
              <Image src="/assets/images/back1.png" alt="" width={32} height={32} className="rounded-sm" />
            </div>
            <div className="w-8 h-8 animate-bounce opacity-90">
              <Image src="/assets/images/back1.png" alt="" width={32} height={32} className="rounded-sm" />
            </div>
            <div className="w-8 h-8 animate-pulse opacity-70">
              <Image src="/assets/images/back1.png" alt="" width={32} height={32} className="rounded-sm" />
            </div>
            <div className="w-8 h-8 animate-spin opacity-80">
              <Image src="/assets/images/back1.png" alt="" width={32} height={32} className="rounded-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}