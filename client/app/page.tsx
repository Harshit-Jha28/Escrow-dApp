"use client";

import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import ContractUI from "@/components/Contract";
import { connectWallet, getWalletAddress, checkConnection } from "@/hooks/contract";

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (await checkConnection()) {
          const addr = await getWalletAddress();
          if (addr) setWalletAddress(addr);
        }
      } catch {}
    })();
  }, []);

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    try { setWalletAddress(await connectWallet()); }
    catch {}
    finally { setIsConnecting(false); }
  }, []);

  const handleDisconnect = useCallback(() => {
    setWalletAddress(null);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a]">
      <Navbar
        walletAddress={walletAddress}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        isConnecting={isConnecting}
      />

      <main className="flex flex-1 w-full max-w-5xl mx-auto flex-col items-center px-6 pt-12 pb-20">
        
        {/* Hero */}
        <div className="mb-10 text-center animate-fade-in-up">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-sm text-white/50 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7c6cf0] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7c6cf0]" />
            </span>
            Powered by Soroban on Stellar
          </div>

          <h1 className="mb-3">
            <span className="block text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]">
              <span className="text-white">Escrow Service </span>
              <span className="bg-gradient-to-r from-[#7c6cf0] via-[#4fc3f7] to-[#7c6cf0] bg-[length:200%_auto] animate-gradient-shift bg-clip-text text-transparent">
                on the Blockchain
              </span>
            </span>
          </h1>

          <p className="mx-auto max-w-lg text-sm sm:text-base leading-relaxed text-white/40">
            Register products, secure transactions, and verify authenticity — immutably on Stellar.
          </p>

          <div className="mt-6 flex items-center justify-center gap-8 animate-fade-in-up-delayed">
            {[
              { label: "Finality", value: "~5s" },
              { label: "Cost", value: "<$0.01" },
              { label: "Network", value: "Testnet" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-lg font-semibold text-[#ededed] font-mono">
                  {stat.value}
                </p>
                <p className="text-[11px] text-[#666] mt-0.5">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Contract UI */}
        <ContractUI
          walletAddress={walletAddress}
          onConnect={handleConnect}
          isConnecting={isConnecting}
        />

        {/* Footer */}
        <div className="mt-12 flex items-center gap-4 text-[11px] text-[#444] animate-fade-in">
          <span>Stellar Network</span>
          <span className="h-3 w-px bg-[#262626]" />
          <span>Freighter Wallet</span>
          <span className="h-3 w-px bg-[#262626]" />
          <span>Soroban Smart Contracts</span>
        </div>

      </main>
    </div>
  );
}