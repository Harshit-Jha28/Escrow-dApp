"use client";

import { useState, useCallback, useEffect } from "react";
import {
  createEscrow,
  setEscrowAmount as setEscrowAmountContract,
  getEscrow,
  getEscrowState,
  releaseEscrow,
  cancelEscrow,
  claimTimeout,
  isEscrowResolved,
  getEscrowCount,
  CONTRACT_ADDRESS,
} from "@/hooks/contract";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Spotlight } from "@/components/ui/spotlight";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Icons ────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function DollarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

// ── Styled Input ─────────────────────────────────────────────

function Input({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">
        {label}
      </label>
      <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-px transition-all focus-within:border-[#7c6cf0]/30 focus-within:shadow-[0_0_20px_rgba(124,108,240,0.08)]">
        <input
          {...props}
          className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none"
        />
      </div>
    </div>
  );
}

// ── Escrow State Badge ───────────────────────────────────────

const STATE_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string; variant: "success" | "warning" | "info" | "error" }> = {
  Pending: { color: "text-[#fbbf24]", bg: "bg-[#fbbf24]/10", border: "border-[#fbbf24]/20", dot: "bg-[#fbbf24]", variant: "warning" },
  Released: { color: "text-[#34d399]", bg: "bg-[#34d399]/10", border: "border-[#34d399]/20", dot: "bg-[#34d399]", variant: "success" },
  Cancelled: { color: "text-[#f87171]", bg: "bg-[#f87171]/10", border: "border-[#f87171]/20", dot: "bg-[#f87171]", variant: "error" },
  Expired: { color: "text-[#4fc3f7]", bg: "bg-[#4fc3f7]/10", border: "border-[#4fc3f7]/20", dot: "bg-[#4fc3f7]", variant: "info" },
};

// ── Main Component ───────────────────────────────────────────

type Tab = "create" | "view" | "interact";

interface EscrowData {
  buyer: string;
  seller: string;
  amount: string;
  created_at: string;
  deadline: string;
  buyer_released: boolean;
  seller_released: boolean;
  buyer_cancelled: boolean;
  seller_cancelled: boolean;
}

interface ContractUIProps {
  walletAddress: string | null;
  onConnect: () => void;
  isConnecting: boolean;
}

export default function ContractUI({ walletAddress, onConnect, isConnecting }: ContractUIProps) {
  const [activeTab, setActiveTab] = useState<Tab>("create");
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  // Create escrow state
  const [sellerAddress, setSellerAddress] = useState("");
  const [deadlineHours, setDeadlineHours] = useState("24");
  const [escrowAmount, setEscrowAmount] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createdEscrowId, setCreatedEscrowId] = useState<string | null>(null);

  // View escrow state
  const [viewEscrowId, setViewEscrowId] = useState("");
  const [isViewing, setIsViewing] = useState(false);
  const [escrowData, setEscrowData] = useState<EscrowData | null>(null);
  const [escrowState, setEscrowState] = useState<string | null>(null);

  // Interact state
  const [interactEscrowId, setInteractEscrowId] = useState("");
  const [isInteracting, setIsInteracting] = useState(false);

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const formatAmount = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num.toLocaleString();
  };

  // Calculate deadline timestamp
  const getDeadlineTimestamp = () => {
    const hours = parseInt(deadlineHours) || 24;
    const now = Math.floor(Date.now() / 1000);
    return BigInt(now + hours * 3600);
  };

  // Convert U256 escrow ID to string
  const parseEscrowId = (result: any): string => {
    if (typeof result === 'object' && result !== null) {
      if ('value' in result) return result.value.toString();
      if ('high' in result && 'low' in result) {
        const high = BigInt(result.high);
        const low = BigInt(result.low);
        return ((high << 64n) + low).toString();
      }
    }
    return String(result);
  };

  // Parse escrow data from contract response
  const parseEscrowData = (data: any): EscrowData | null => {
    if (!data || typeof data !== 'object') return null;
    return {
      buyer: data.buyer?.[0] || data.buyer || "",
      seller: data.seller?.[0] || data.seller || "",
      amount: data.amount?.[0]?.toString() || data.amount?.toString() || "0",
      created_at: data.created_at?.[0]?.toString() || data.created_at?.toString() || "0",
      deadline: data.deadline?.[0]?.toString() || data.deadline?.toString() || "0",
      buyer_released: Boolean(data.buyer_released),
      seller_released: Boolean(data.seller_released),
      buyer_cancelled: Boolean(data.buyer_cancelled),
      seller_cancelled: Boolean(data.seller_cancelled),
    };
  };

  const handleCreateEscrow = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!sellerAddress.trim()) return setError("Enter seller address");
    if (!escrowAmount.trim() || parseFloat(escrowAmount) <= 0) return setError("Enter valid amount");
    
    setError(null);
    setIsCreating(true);
    setTxStatus("Creating escrow...");
    setCreatedEscrowId(null);
    
    try {
      // Create escrow
      const result = await createEscrow(walletAddress, walletAddress, sellerAddress.trim(), getDeadlineTimestamp());
      const escrowId = parseEscrowId(result);
      
      // Set amount
      setTxStatus("Setting amount...");
      await setEscrowAmountContract(walletAddress, escrowId, BigInt(parseFloat(escrowAmount) * 10000000));
      
      setTxStatus("Escrow created on-chain!");
      setCreatedEscrowId(escrowId);
      setSellerAddress("");
      setEscrowAmount("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsCreating(false);
    }
  }, [walletAddress, sellerAddress, escrowAmount, deadlineHours]);

  const handleViewEscrow = useCallback(async () => {
    if (!viewEscrowId.trim()) return setError("Enter escrow ID");
    setError(null);
    setIsViewing(true);
    setEscrowData(null);
    setEscrowState(null);
    
    try {
      const [data, state] = await Promise.all([
        getEscrow(viewEscrowId.trim(), walletAddress || undefined),
        getEscrowState(viewEscrowId.trim(), walletAddress || undefined),
      ]);
      
      setEscrowData(parseEscrowData(data));
      
      // Parse state - could be number or string
      if (typeof state === 'number') {
        const states = ["Pending", "Released", "Cancelled", "Expired"];
        setEscrowState(states[state] || "Unknown");
      } else if (typeof state === 'string') {
        setEscrowState(state);
      } else if (state && typeof state === 'object') {
        const states = ["Pending", "Released", "Cancelled", "Expired"];
        if ('value' in state) {
          setEscrowState(states[Number(state.value)] || "Unknown");
        } else {
          setEscrowState("Pending");
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setIsViewing(false);
    }
  }, [viewEscrowId, walletAddress]);

  const handleRelease = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!interactEscrowId.trim()) return setError("Enter escrow ID");
    setError(null);
    setIsInteracting(true);
    setTxStatus("Releasing escrow...");
    try {
      await releaseEscrow(walletAddress, interactEscrowId.trim());
      setTxStatus("Escrow released!");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsInteracting(false);
    }
  }, [walletAddress, interactEscrowId]);

  const handleCancel = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!interactEscrowId.trim()) return setError("Enter escrow ID");
    setError(null);
    setIsInteracting(true);
    setTxStatus("Cancelling escrow...");
    try {
      await cancelEscrow(walletAddress, interactEscrowId.trim());
      setTxStatus("Escrow cancelled!");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsInteracting(false);
    }
  }, [walletAddress, interactEscrowId]);

  const handleClaimTimeout = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!interactEscrowId.trim()) return setError("Enter escrow ID");
    setError(null);
    setIsInteracting(true);
    setTxStatus("Claiming timeout refund...");
    try {
      await claimTimeout(walletAddress, interactEscrowId.trim());
      setTxStatus("Refund claimed!");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsInteracting(false);
    }
  }, [walletAddress, interactEscrowId]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "create", label: "Create", icon: <PlusIcon />, color: "#34d399" },
    { key: "view", label: "View", icon: <SearchIcon />, color: "#4fc3f7" },
    { key: "interact", label: "Interact", icon: <ShieldIcon />, color: "#fbbf24" },
  ];

  return (
    <div className="w-full max-w-2xl animate-fade-in-up-delayed">
      {/* Toasts */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#f87171]/15 bg-[#f87171]/[0.05] px-4 py-3 backdrop-blur-sm animate-slide-down">
          <span className="mt-0.5 text-[#f87171]"><AlertIcon /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#f87171]/90">Error</p>
            <p className="text-xs text-[#f87171]/50 mt-0.5 break-all">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="shrink-0 text-[#f87171]/30 hover:text-[#f87171]/70 text-lg leading-none">&times;</button>
        </div>
      )}

      {txStatus && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#34d399]/15 bg-[#34d399]/[0.05] px-4 py-3 backdrop-blur-sm shadow-[0_0_30px_rgba(52,211,153,0.05)] animate-slide-down">
          <span className="text-[#34d399]">
            {txStatus.includes("on-chain") || txStatus.includes("claimed") || txStatus.includes("released") || txStatus.includes("cancelled") ? <CheckIcon /> : <SpinnerIcon />}
          </span>
          <span className="text-sm text-[#34d399]/90">{txStatus}</span>
        </div>
      )}

      {/* Main Card */}
      <Spotlight className="rounded-2xl">
        <AnimatedCard className="p-0" containerClassName="rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#34d399]/20 to-[#4fc3f7]/20 border border-white/[0.06]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#34d399]">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">Escrow Service</h3>
                <p className="text-[10px] text-white/25 font-mono mt-0.5">{truncate(CONTRACT_ADDRESS)}</p>
              </div>
            </div>
            <Badge variant="success" className="text-[10px]">Soroban</Badge>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] px-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setError(null); setEscrowData(null); setCreatedEscrowId(null); }}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all",
                  activeTab === t.key ? "text-white/90" : "text-white/35 hover:text-white/55"
                )}
              >
                <span style={activeTab === t.key ? { color: t.color } : undefined}>{t.icon}</span>
                {t.label}
                {activeTab === t.key && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full transition-all"
                    style={{ background: `linear-gradient(to right, ${t.color}, ${t.color}66)` }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Create Escrow */}
            {activeTab === "create" && (
              <div className="space-y-5">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 font-mono text-sm">
                  <span style={{ color: "#34d399" }} className="font-semibold">fn</span>
                  <span className="text-white/70">create</span>
                  <span className="text-white/20 text-xs">(buyer: Address, seller: Address, deadline: u64)</span>
                </div>
                
                <Input 
                  label="Seller Address" 
                  value={sellerAddress} 
                  onChange={(e) => setSellerAddress(e.target.value)} 
                  placeholder="G..." 
                />
                
                <Input 
                  label="Amount (XLM)" 
                  type="number"
                  value={escrowAmount} 
                  onChange={(e) => setEscrowAmount(e.target.value)} 
                  placeholder="100"
                />
                
                <Input 
                  label="Deadline (hours)" 
                  type="number"
                  value={deadlineHours} 
                  onChange={(e) => setDeadlineHours(e.target.value)} 
                  placeholder="24"
                />

                {createdEscrowId && (
                  <div className="rounded-xl border border-[#34d399]/20 bg-[#34d399]/[0.05] px-4 py-3 animate-fade-in-up">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[#34d399]/60">Escrow Created</p>
                    <p className="font-mono text-sm text-[#34d399] mt-1">ID: {createdEscrowId}</p>
                  </div>
                )}

                {walletAddress ? (
                  <ShimmerButton onClick={handleCreateEscrow} disabled={isCreating} shimmerColor="#34d399" className="w-full">
                    {isCreating ? <><SpinnerIcon /> Creating...</> : <><PlusIcon /> Create Escrow</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#34d399]/20 bg-[#34d399]/[0.03] py-4 text-sm text-[#34d399]/60 hover:border-[#34d399]/30 hover:text-[#34d399]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to create escrow
                  </button>
                )}
              </div>
            )}

            {/* View Escrow */}
            {activeTab === "view" && (
              <div className="space-y-5">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 font-mono text-sm">
                  <span style={{ color: "#4fc3f7" }} className="font-semibold">fn</span>
                  <span className="text-white/70">get_escrow</span>
                  <span className="text-white/20 text-xs">(escrow_id: U256)</span>
                </div>

                <Input 
                  label="Escrow ID" 
                  value={viewEscrowId} 
                  onChange={(e) => setViewEscrowId(e.target.value)} 
                  placeholder="0"
                />

                <ShimmerButton onClick={handleViewEscrow} disabled={isViewing} shimmerColor="#4fc3f7" className="w-full">
                  {isViewing ? <><SpinnerIcon /> Querying...</> : <><SearchIcon /> View Escrow</>}
                </ShimmerButton>

                {escrowData && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden animate-fade-in-up">
                    <div className="border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">Escrow Details</span>
                      {escrowState && (
                        <Badge variant={STATE_CONFIG[escrowState]?.variant || "info"}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", STATE_CONFIG[escrowState]?.dot)} />
                          {escrowState}
                        </Badge>
                      )}
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/35 flex items-center gap-1.5"><DollarIcon /> Amount</span>
                        <span className="font-mono text-sm text-white/80">{formatAmount(parseFloat(escrowData.amount) / 10000000)} XLM</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/35">Buyer</span>
                        <span className="font-mono text-sm text-white/80">{truncate(escrowData.buyer)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/35">Seller</span>
                        <span className="font-mono text-sm text-white/80">{truncate(escrowData.seller)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/35 flex items-center gap-1.5"><ClockIcon /> Deadline</span>
                        <span className="font-mono text-sm text-white/80">
                          {escrowData.deadline ? new Date(Number(escrowData.deadline) * 1000).toLocaleString() : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 pt-2 border-t border-white/[0.06]">
                        <div className="flex items-center gap-2">
                          <div className={cn("h-2 w-2 rounded-full", escrowData.buyer_released ? "bg-[#34d399]" : "bg-white/20")} />
                          <span className="text-[10px] text-white/35">Buyer Released</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={cn("h-2 w-2 rounded-full", escrowData.seller_released ? "bg-[#34d399]" : "bg-white/20")} />
                          <span className="text-[10px] text-white/35">Seller Released</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Interact with Escrow */}
            {activeTab === "interact" && (
              <div className="space-y-5">
                <Input 
                  label="Escrow ID" 
                  value={interactEscrowId} 
                  onChange={(e) => setInteractEscrowId(e.target.value)} 
                  placeholder="0"
                />

                <div className="space-y-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-white/25">Actions (require both parties)</p>
                  
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/70">Release Funds</span>
                      <span className="text-[10px] text-white/25">Both parties must call</span>
                    </div>
                    {walletAddress ? (
                      <ShimmerButton onClick={handleRelease} disabled={isInteracting} shimmerColor="#34d399" className="w-full">
                        {isInteracting ? <><SpinnerIcon /> Processing...</> : <><CheckIcon /> Release</>}
                      </ShimmerButton>
                    ) : (
                      <button onClick={onConnect} className="w-full rounded-lg border border-dashed border-[#34d399]/20 bg-[#34d399]/[0.02] py-2.5 text-xs text-[#34d399]/60">
                        Connect to Release
                      </button>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/70">Cancel Escrow</span>
                      <span className="text-[10px] text-white/25">Both parties must call</span>
                    </div>
                    {walletAddress ? (
                      <ShimmerButton onClick={handleCancel} disabled={isInteracting} shimmerColor="#fbbf24" className="w-full">
                        {isInteracting ? <><SpinnerIcon /> Processing...</> : <><RefreshIcon /> Cancel</>}
                      </ShimmerButton>
                    ) : (
                      <button onClick={onConnect} className="w-full rounded-lg border border-dashed border-[#fbbf24]/20 bg-[#fbbf24]/[0.02] py-2.5 text-xs text-[#fbbf24]/60">
                        Connect to Cancel
                      </button>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/70">Claim Timeout</span>
                      <span className="text-[10px] text-white/25">Only buyer, after deadline</span>
                    </div>
                    {walletAddress ? (
                      <ShimmerButton onClick={handleClaimTimeout} disabled={isInteracting} shimmerColor="#f87171" className="w-full">
                        {isInteracting ? <><SpinnerIcon /> Processing...</> : <><ClockIcon /> Claim Refund</>}
                      </ShimmerButton>
                    ) : (
                      <button onClick={onConnect} className="w-full rounded-lg border border-dashed border-[#f87171]/20 bg-[#f87171]/[0.02] py-2.5 text-xs text-[#f87171]/60">
                        Connect to Claim
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.04] px-6 py-3 flex items-center justify-between">
            <p className="text-[10px] text-white/15">Escrow Service &middot; Soroban</p>
            <div className="flex items-center gap-2">
              {["Pending", "Released", "Cancelled"].map((s, i) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className={cn("h-1 w-1 rounded-full", STATE_CONFIG[s]?.dot ?? "bg-white/20")} />
                  <span className="font-mono text-[9px] text-white/15">{s}</span>
                  {i < 2 && <span className="text-white/10 text-[8px]">&rarr;</span>}
                </span>
              ))}
            </div>
          </div>
        </AnimatedCard>
      </Spotlight>
    </div>
  );
}
