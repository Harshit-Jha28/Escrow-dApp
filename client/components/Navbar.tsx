"use client";

import { useState, useEffect, useCallback } from "react";
import { NETWORK } from "@/hooks/contract";
import { Badge } from "@/components/ui/badge";

interface NavbarProps {
  walletAddress: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  isConnecting: boolean;
}

export default function Navbar({
  walletAddress,
  onConnect,
  onDisconnect,
  isConnecting,
}: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
        scrolled
          ? "border-white/[0.08] bg-[#050510]/90 backdrop-blur-xl"
          : "border-white/[0.04] bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        
        {/* Logo */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">Escrow</span>
          <span className="text-xs text-gray-400 hidden sm:inline">v1.0</span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Badge variant="success">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            {NETWORK}
          </Badge>

          {walletAddress ? (
            <button
              onClick={onDisconnect}
              className="text-sm text-red-400"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm text-black"
            >
              {isConnecting ? "Connecting..." : "Connect"}
            </button>
          )}
        </div>

      </div>
    </nav>
  );
}