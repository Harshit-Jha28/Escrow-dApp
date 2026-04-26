"use client";

import { useState, useCallback } from "react";
import {
  createEscrow,
  setEscrowAmount as setEscrowAmountContract,
  getEscrow,
  getEscrowState,
  releaseEscrow,
  cancelEscrow,
  claimTimeout,
  CONTRACT_ADDRESS,
  scValToNative,
} from "@/hooks/contract";
import { Badge } from "@/components/ui/badge";

// ── Icons ────────────────────────────────────────────────

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
      <path d="M5 12h14" /><path d="M12 5v14" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
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
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
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

// ── Input ────────────────────────────────────────────────

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-[#666]">{label}</label>
      <input
        {...props}
        className="w-full rounded-lg border border-[#262626] bg-[#111] px-3 py-2.5 font-mono text-sm text-[#ededed] placeholder:text-[#444] focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-colors outline-none"
      />
    </div>
  );
}

// ── Button ───────────────────────────────────────────────

function Button({ variant = "primary", className = "", children, ...props }: { variant?: "primary" | "secondary" | "danger" } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary: "bg-[#ededed] text-[#0a0a0a] hover:bg-white disabled:bg-[#333] disabled:text-[#666]",
    secondary: "bg-[#191919] text-[#a1a1a1] border border-[#262626] hover:bg-[#222] hover:text-[#ededed] disabled:opacity-50",
    danger: "bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 hover:bg-[#ef4444]/20 disabled:opacity-50",
  };
  return (
    <button className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all active:scale-[0.98] disabled:cursor-not-allowed ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

// ── State Config ─────────────────────────────────────────

const STATE_VARIANT: Record<string, "success" | "warning" | "info" | "error"> = {
  Pending: "warning",
  Released: "success",
  Cancelled: "error",
  Expired: "info",
};

// ── Types ────────────────────────────────────────────────

type Tab = "create" | "view" | "interact";

interface EscrowData {
  buyer: string; seller: string; amount: string; created_at: string; deadline: string;
  buyer_released: boolean; seller_released: boolean; buyer_cancelled: boolean; seller_cancelled: boolean;
}

interface ContractUIProps {
  walletAddress: string | null;
  onConnect: () => void;
  isConnecting: boolean;
}

// ── Main Component ───────────────────────────────────────

export default function ContractUI({ walletAddress, onConnect, isConnecting }: ContractUIProps) {
  const [activeTab, setActiveTab] = useState<Tab>("create");
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  const [sellerAddress, setSellerAddress] = useState("");
  const [deadlineHours, setDeadlineHours] = useState("24");
  const [escrowAmount, setEscrowAmount] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createdEscrowId, setCreatedEscrowId] = useState<string | null>(null);

  const [viewEscrowId, setViewEscrowId] = useState("");
  const [isViewing, setIsViewing] = useState(false);
  const [escrowData, setEscrowData] = useState<EscrowData | null>(null);
  const [escrowState, setEscrowState] = useState<string | null>(null);

  const [interactEscrowId, setInteractEscrowId] = useState("");
  const [isInteracting, setIsInteracting] = useState(false);

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const formatXLM = (stroops: string) => (parseFloat(stroops) / 10000000).toLocaleString();

  const getDeadlineTimestamp = () => BigInt(Math.floor(Date.now() / 1000) + (parseInt(deadlineHours) || 24) * 3600);

  const parseEscrowData = (data: any): EscrowData | null => {
    if (!data || typeof data !== "object") return null;
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
    setError(null); setIsCreating(true); setTxStatus("Creating escrow..."); setCreatedEscrowId(null);
    try {
      const result = await createEscrow(walletAddress, walletAddress, sellerAddress.trim(), getDeadlineTimestamp());
      let escrowId: string;
      if (result && typeof result === "object" && "returnValue" in result && result.returnValue) {
        escrowId = scValToNative(result.returnValue).toString();
      } else {
        escrowId = String(result);
      }
      setTxStatus("Setting amount...");
      await setEscrowAmountContract(walletAddress, escrowId, BigInt(Math.round(parseFloat(escrowAmount) * 10000000)));
      setTxStatus("Escrow created!"); setCreatedEscrowId(escrowId);
      setSellerAddress(""); setEscrowAmount("");
      setTimeout(() => setTxStatus(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed"); setTxStatus(null);
    } finally { setIsCreating(false); }
  }, [walletAddress, sellerAddress, escrowAmount, deadlineHours]);

  const handleViewEscrow = useCallback(async () => {
    if (!viewEscrowId.trim()) return setError("Enter escrow ID");
    setError(null); setIsViewing(true); setEscrowData(null); setEscrowState(null);
    try {
      const [data, state] = await Promise.all([
        getEscrow(viewEscrowId.trim(), walletAddress || undefined),
        getEscrowState(viewEscrowId.trim(), walletAddress || undefined),
      ]);
      setEscrowData(parseEscrowData(data));
      if (typeof state === "number") setEscrowState(["Pending", "Released", "Cancelled", "Expired"][state] || "Unknown");
      else if (typeof state === "string") setEscrowState(state);
      else if (state && typeof state === "object" && "value" in state) setEscrowState(["Pending", "Released", "Cancelled", "Expired"][Number(state.value)] || "Unknown");
      else setEscrowState("Pending");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally { setIsViewing(false); }
  }, [viewEscrowId, walletAddress]);

  const handleAction = useCallback(async (action: "release" | "cancel" | "claim_timeout", label: string) => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!interactEscrowId.trim()) return setError("Enter escrow ID");
    setError(null); setIsInteracting(true); setTxStatus(`${label}...`);
    try {
      const fn = action === "release" ? releaseEscrow : action === "cancel" ? cancelEscrow : claimTimeout;
      await fn(walletAddress, interactEscrowId.trim());
      setTxStatus(`${label} — done!`);
      setTimeout(() => setTxStatus(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed"); setTxStatus(null);
    } finally { setIsInteracting(false); }
  }, [walletAddress, interactEscrowId]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "create", label: "Create", icon: <PlusIcon /> },
    { key: "view", label: "View", icon: <SearchIcon /> },
    { key: "interact", label: "Interact", icon: <ShieldIcon /> },
  ];

  return (
    <div className="w-full max-w-xl animate-fade-in-up-delayed">
      {/* Error toast */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-[#ef4444]/20 bg-[#ef4444]/5 px-4 py-3 animate-slide-down">
          <span className="mt-0.5 text-[#ef4444]"><AlertIcon /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#ef4444]">Error</p>
            <p className="text-xs text-[#ef4444]/70 mt-0.5 break-all">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-[#ef4444]/40 hover:text-[#ef4444] text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Status toast */}
      {txStatus && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-[#22c55e]/20 bg-[#22c55e]/5 px-4 py-3 animate-slide-down">
          <span className="text-[#22c55e]">{txStatus.includes("done") || txStatus.includes("created") ? <CheckIcon /> : <SpinnerIcon />}</span>
          <span className="text-sm text-[#22c55e]">{txStatus}</span>
        </div>
      )}

      {/* Main Card */}
      <div className="rounded-xl border border-[#262626] bg-[#111] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#262626] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-[#ededed]">Escrow Service</h3>
              <p className="text-[10px] text-[#666] font-mono">{truncate(CONTRACT_ADDRESS)}</p>
            </div>
          </div>
          <Badge variant="info">Soroban</Badge>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#262626]">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); setError(null); setEscrowData(null); setCreatedEscrowId(null); }}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors relative ${
                activeTab === t.key ? "text-[#ededed]" : "text-[#666] hover:text-[#a1a1a1]"
              }`}
            >
              {t.icon} {t.label}
              {activeTab === t.key && <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[#6366f1]" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {activeTab === "create" && (
            <>
              <Input label="Seller Address" value={sellerAddress} onChange={(e) => setSellerAddress(e.target.value)} placeholder="G..." />
              <Input label="Amount (XLM)" type="number" value={escrowAmount} onChange={(e) => setEscrowAmount(e.target.value)} placeholder="100" />
              <Input label="Deadline (hours)" type="number" value={deadlineHours} onChange={(e) => setDeadlineHours(e.target.value)} placeholder="24" />
              {createdEscrowId && (
                <div className="rounded-lg border border-[#22c55e]/20 bg-[#22c55e]/5 px-4 py-3 animate-fade-in-up">
                  <p className="text-xs text-[#22c55e]/70">Escrow Created</p>
                  <p className="font-mono text-sm text-[#22c55e] mt-0.5">ID: {createdEscrowId}</p>
                </div>
              )}
              {walletAddress ? (
                <Button onClick={handleCreateEscrow} disabled={isCreating} className="w-full">
                  {isCreating ? <><SpinnerIcon /> Creating...</> : <><PlusIcon /> Create Escrow</>}
                </Button>
              ) : (
                <Button variant="secondary" onClick={onConnect} disabled={isConnecting} className="w-full">
                  Connect wallet to create escrow
                </Button>
              )}
            </>
          )}

          {activeTab === "view" && (
            <>
              <Input label="Escrow ID" value={viewEscrowId} onChange={(e) => setViewEscrowId(e.target.value)} placeholder="0" />
              <Button onClick={handleViewEscrow} disabled={isViewing} className="w-full">
                {isViewing ? <><SpinnerIcon /> Querying...</> : <><SearchIcon /> View Escrow</>}
              </Button>
              {escrowData && (
                <div className="rounded-lg border border-[#262626] overflow-hidden animate-fade-in-up">
                  <div className="border-b border-[#262626] px-4 py-2.5 flex items-center justify-between bg-[#0a0a0a]">
                    <span className="text-xs font-medium text-[#666]">Escrow Details</span>
                    {escrowState && <Badge variant={STATE_VARIANT[escrowState] || "info"}>{escrowState}</Badge>}
                  </div>
                  <div className="p-4 space-y-2.5 text-sm">
                    {[
                      ["Amount", `${formatXLM(escrowData.amount)} XLM`],
                      ["Buyer", truncate(escrowData.buyer)],
                      ["Seller", truncate(escrowData.seller)],
                      ["Deadline", escrowData.deadline ? new Date(Number(escrowData.deadline) * 1000).toLocaleString() : "N/A"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between">
                        <span className="text-[#666]">{k}</span>
                        <span className="font-mono text-[#a1a1a1]">{v}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-4 pt-2 border-t border-[#262626]">
                      <div className="flex items-center gap-1.5">
                        <div className={`h-2 w-2 rounded-full ${escrowData.buyer_released ? "bg-[#22c55e]" : "bg-[#333]"}`} />
                        <span className="text-xs text-[#666]">Buyer Released</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`h-2 w-2 rounded-full ${escrowData.seller_released ? "bg-[#22c55e]" : "bg-[#333]"}`} />
                        <span className="text-xs text-[#666]">Seller Released</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "interact" && (
            <>
              <Input label="Escrow ID" value={interactEscrowId} onChange={(e) => setInteractEscrowId(e.target.value)} placeholder="0" />
              <div className="space-y-3 pt-1">
                {[
                  { action: "release" as const, label: "Releasing escrow", btnLabel: "Release Funds", note: "Both parties must call", icon: <CheckIcon />, variant: "primary" as const },
                  { action: "cancel" as const, label: "Cancelling escrow", btnLabel: "Cancel Escrow", note: "Both parties must call", icon: <AlertIcon />, variant: "secondary" as const },
                  { action: "claim_timeout" as const, label: "Claiming refund", btnLabel: "Claim Timeout", note: "Only buyer, after deadline", icon: <ClockIcon />, variant: "danger" as const },
                ].map((item) => (
                  <div key={item.action} className="rounded-lg border border-[#262626] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#ededed]">{item.btnLabel}</span>
                      <span className="text-[10px] text-[#666]">{item.note}</span>
                    </div>
                    {walletAddress ? (
                      <Button variant={item.variant} onClick={() => handleAction(item.action, item.label)} disabled={isInteracting} className="w-full">
                        {isInteracting ? <><SpinnerIcon /> Processing...</> : <>{item.icon} {item.btnLabel}</>}
                      </Button>
                    ) : (
                      <Button variant="secondary" onClick={onConnect} className="w-full">
                        Connect to {item.btnLabel}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#262626] px-5 py-2.5 flex items-center justify-between">
          <p className="text-[10px] text-[#444]">Escrow Service · Soroban</p>
          <div className="flex items-center gap-3">
            {["Pending", "Released", "Cancelled"].map((s) => (
              <span key={s} className="flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${s === "Pending" ? "bg-[#eab308]" : s === "Released" ? "bg-[#22c55e]" : "bg-[#ef4444]"}`} />
                <span className="text-[9px] text-[#444]">{s}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
