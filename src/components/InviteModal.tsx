"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
}

export default function InviteModal({ isOpen, onClose, groupId, groupName }: InviteModalProps) {
  const { user } = useAuth();
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [emailToInvite, setEmailToInvite] = useState("");
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState("");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setInviteLink(`${window.location.origin}/group/${groupId}/join`);
    }
  }, [groupId, isOpen]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setEmailToInvite("");
      setSendSuccess(false);
      setSendError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailToInvite) return;

    setSending(true);
    setSendError("");
    setSendSuccess(false);

    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToInvite,
          inviteLink,
          groupName,
          senderName: user?.displayName || "A friend"
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      setSendSuccess(true);
      setEmailToInvite("");
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (err: any) {
      setSendError(err.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-white text-center mb-2">Invite Members</h2>
        <p className="text-slate-400 text-center text-sm mb-6">
          Share this link with anyone you want to add to <strong>{groupName}</strong>.
        </p>

        <div className="bg-slate-800 rounded-xl p-3 flex items-center gap-3 border border-white/5 mb-6">
          <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-emerald-400 text-sm font-mono pl-2">
            {inviteLink}
          </div>
          <button
            onClick={handleCopy}
            className={`flex-shrink-0 font-semibold py-2 px-4 rounded-lg text-sm transition-all ${
              copied 
                ? 'bg-emerald-500 text-slate-900' 
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>

        <div className="relative flex items-center mb-6">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="flex-shrink-0 mx-4 text-slate-500 text-xs uppercase tracking-wider">or email them</span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        {sendError && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-4 text-center">
            {sendError}
          </div>
        )}

        {sendSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 p-3 rounded-lg text-sm mb-4 text-center">
            Invitation sent successfully!
          </div>
        )}

        <form onSubmit={handleSendEmail} className="flex gap-2">
          <input
            type="email"
            placeholder="friend@example.com"
            value={emailToInvite}
            onChange={(e) => setEmailToInvite(e.target.value)}
            className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
            required
          />
          <button
            type="submit"
            disabled={sending || !emailToInvite}
            className="flex-shrink-0 flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-500/50 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
