"use client";
import React, { useState } from "react";
import Image from "next/image";

const VALID_PASSWORDS = [
  "admin2024",
  "cardgen123", 
  "studio2024",
  "testuser",
  "demo123"
];

export default function UserAuth({ 
  onAuthenticated 
}: { 
  onAuthenticated: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Simular verificación
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (VALID_PASSWORDS.includes(password)) {
      onAuthenticated();
    } else {
      setError("Invalid access code. Please try again.");
    }
    
    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundImage: "url(/assets/images/studio.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Backdrop blur overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Auth card */}
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center">
          {/* Logo/Icon */}
          <div className="mb-6 flex justify-center">
            <div className="relative w-16 h-16 rounded-full bg-white/20 p-3 backdrop-blur">
              <Image 
                src="/assets/images/back1.png" 
                alt="Logo" 
                width={40} 
                height={40} 
                className="rounded-sm opacity-80"
              />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white mb-2">
            Card Generator Studio
          </h1>
          <p className="text-white/70 text-sm mb-8">
            Enter your access code to continue
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Access Code"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition"
                required
              />
            </div>

            {error && (
              <div className="text-red-300 text-sm bg-red-500/20 border border-red-400/20 rounded-lg p-3 backdrop-blur">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-6 rounded-xl font-medium transition-all ${
                loading
                  ? "bg-white/20 text-white/50 cursor-not-allowed"
                  : "bg-white text-black hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white/70 rounded-full animate-spin"></div>
                  <span>Verifying...</span>
                </div>
              ) : (
                "Enter Studio"
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-6 text-xs text-white/50">
            Demo codes: admin2024, cardgen123, studio2024, testuser, demo123
          </div>
        </div>
      </div>
    </div>
  );
}