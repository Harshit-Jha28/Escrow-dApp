"use client";

import { useState, useEffect, useCallback } from "react";
import { NETWORK } from "@/hooks/contract";
import { Badge } from "@/components/ui/badge";

function WalletIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckSmallIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PowerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  );
}

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
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!showDropdown) return;
    const close = () => setShowDropdown(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showDropdown]);

  const handleCopy = useCallback(async () => {
    if (!walletAddress) return;
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [walletAddress]);

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
   <nav
  className={`sticky top-0 z-50 w-full border-b transition-all duration-300 animate-fade-in-down ${
    scrolled
      ? "border-white/[0.08] bg-[#050510]/90 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
      : "border-white/[0.04] bg-transparent backdrop-blur-sm"
  }`}
>
=======
      className={`sticky top-0 z-50 w-full border-b transition-colors duration-200 animate-fade-in-down ${
        scrolled
          ? "border-[#262626] bg-[#0a0a0a]"
          : "border-transparent bg-[#0a0a0a]"
      }`}
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        
        {/* Logo */}
        <div className="flex items-center gap-3">
  <div className="flex items-center gap-2">
    <span className="hidden sm:inline-block text-[10px] font-mono text-white/20 border border-white/[0.06] rounded px-1.5 py-0.5">
      v1.0
    </span>
  </div>
</div>
=======
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span className="text-sm font-semibold text-[#ededed]">
            Escrow
          </span>
          <span className="text-xs font-mono text-[#666] hidden sm:inline">v1.0</span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Badge variant="success">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
            {NETWORK}
          </Badge>

          {walletAddress ? (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdown(!showDropdown);
                }}
                className="flex items-center gap-2 rounded-lg border border-[#262626] bg-[#111] px-3 py-2 text-sm transition-colors hover:border-[#333] hover:bg-[#191919]"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#6366f1] text-[9px] font-bold text-white">
                  {walletAddress.slice(1, 3).toUpperCase()}
                </div>
                <span className="font-mono text-xs text-[#a1a1a1]">
                  {truncate(walletAddress)}
                </span>
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className={`text-[#666] transition-transform duration-200 ${showDropdown ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Dropdown */}
              {showDropdown && (
                <div
                  className="absolute right-0 top-full mt-2 w-72 overflow-hidden rounded-lg border border-[#262626] bg-[#111] shadow-xl animate-fade-in-up"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-3 border-b border-[#262626]">
                    <p className="text-[11px] font-medium text-[#666] mb-1.5">
                      Connected Wallet
                    </p>
                    <p className="font-mono text-xs text-[#a1a1a1] break-all leading-relaxed">
                      {walletAddress}
                    </p>
                  </div>

                  <div className="p-1">
                    <button
                      onClick={() => {
                        handleCopy();
                        setShowDropdown(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[#a1a1a1] hover:bg-[#191919] hover:text-[#ededed] transition-colors"
                    >
                      {copied ? <CheckSmallIcon /> : <CopyIcon />}
                      {copied ? "Copied!" : "Copy Address"}
                    </button>

                    <button
                      onClick={() => {
                        onDisconnect();
                        setShowDropdown(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
                    >
                      <PowerIcon />
                      Disconnect
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className="flex items-center gap-2 rounded-lg bg-[#ededed] px-4 py-2 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-white active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Connecting...
                </>
              ) : (
                <>
                  <WalletIcon size={14} />
                  Connect
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}