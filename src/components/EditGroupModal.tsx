"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import QRCode from "react-qr-code";

interface UserProfile {
  uid: string;
  displayName: string;
  email: string | null;
}

interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  currentName: string;
  currentDescription: string;
  currentCurrency?: string;
  initialTab?: "settings" | "members";
  members?: string[];
  profiles?: Record<string, UserProfile>;
  pendingInvites?: string[];
}

export default function EditGroupModal({ 
  isOpen, 
  onClose, 
  groupId, 
  currentName, 
  currentDescription, 
  currentCurrency = "USD",
  initialTab = "settings",
  members = [],
  profiles = {},
  pendingInvites = []
}: EditGroupModalProps) {
  const [activeTab, setActiveTab] = useState<"settings" | "members">(initialTab);
  const [name, setName] = useState(currentName);
  const [description, setDescription] = useState(currentDescription);
  const [currency, setCurrency] = useState(currentCurrency);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Invite state
  const { user } = useAuth();
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [emailToInvite, setEmailToInvite] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    setName(currentName);
    setDescription(currentDescription);
    setCurrency(currentCurrency || "USD");
    if (isOpen) {
      setActiveTab(initialTab);
      // Generate invite link
      if (typeof window !== "undefined") {
        setInviteLink(`${window.location.origin}/group/${groupId}/join`);
      }
    }
  }, [currentName, currentDescription, currentCurrency, isOpen, initialTab, groupId]);

  if (!isOpen) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");

    try {
      await updateDoc(doc(db, "groups", groupId), {
        name: name.trim(),
        description: description.trim(),
        currency: currency,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update group.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this group? All expenses will be orphaned or must be deleted manually.")) return;
    
    setLoading(true);
    try {
      await deleteDoc(doc(db, "groups", groupId));
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to delete group.");
      setLoading(false);
    }
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleSendInvite = async (e: React.FormEvent) => {
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
          groupName: currentName,
          senderName: user?.displayName || "A friend"
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      await updateDoc(doc(db, "groups", groupId), {
        pendingInvites: arrayUnion(emailToInvite.toLowerCase())
      });

      setSendSuccess(true);
      setEmailToInvite("");
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (err: any) {
      setSendError(err.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const handleRevokeInvite = async (email: string) => {
    try {
      await updateDoc(doc(db, "groups", groupId), {
        pendingInvites: arrayRemove(email)
      });
    } catch (err) {
      console.error("Failed to revoke invite", err);
    }
  };

  const handleKickMember = async (uid: string) => {
    if (uid === user?.uid) {
      alert("You cannot kick yourself from the group. You can leave the group instead.");
      return;
    }
    if (!confirm("Are you sure you want to remove this member from the group?")) return;
    
    try {
      await updateDoc(doc(db, "groups", groupId), {
        members: arrayRemove(uid)
      });
    } catch (err) {
      console.error("Failed to kick member", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-white mb-6">Group Settings</h2>
        
        <div className="flex border-b border-white/10 mb-6">
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex-1 pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === "settings" ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`flex-1 pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === "members" ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            Members & Invites
          </button>
        </div>

        {activeTab === "settings" && (
          <div>
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}
            <form onSubmit={handleUpdate} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Group Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all appearance-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all min-h-[100px]"
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold rounded-xl transition-colors"
                >
                  Delete
                </button>
                <div className="flex-1 flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-900 font-bold py-3 px-4 rounded-xl transition-colors"
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {activeTab === "members" && (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">Members</h3>
              <div className="space-y-2">
                {members.map(uid => {
                  const profile = profiles[uid];
                  const isYou = uid === user?.uid;
                  return (
                    <div key={uid} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3 border border-white/5 gap-2 min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0">
                          {profile?.displayName?.[0] || profile?.email?.[0] || "U"}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white flex items-center gap-2 truncate">
                            <span className="truncate">{profile?.displayName || "Unknown User"}</span>
                            {isYou && <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold flex-shrink-0">You</span>}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{profile?.email}</div>
                        </div>
                      </div>
                      {!isYou && (
                        <button 
                          onClick={() => handleKickMember(uid)}
                          className="text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 px-2 py-1 rounded transition-colors border border-red-500/20"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">Invite Link</h3>
              {inviteLink && (
                <div className="bg-white p-4 rounded-xl flex justify-center mb-4 mx-auto w-fit shadow-lg shadow-emerald-500/10">
                  <QRCode
                    value={inviteLink}
                    size={160}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox={`0 0 160 160`}
                  />
                </div>
              )}
              <div className="bg-slate-800 rounded-xl p-2 flex items-center gap-2 border border-white/5">
                <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-emerald-400 text-xs font-mono pl-2">
                  {inviteLink}
                </div>
                <button
                  onClick={handleCopy}
                  className={`flex-shrink-0 font-semibold py-1.5 px-3 rounded-lg text-xs transition-all ${
                    copied ? 'bg-emerald-500 text-slate-900' : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">Invite by Email</h3>
              <form onSubmit={handleSendInvite} className="flex gap-2">
                <input
                  type="email"
                  value={emailToInvite}
                  onChange={e => setEmailToInvite(e.target.value)}
                  placeholder="Enter email address"
                  className="flex-1 min-w-0 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-all"
                >
                  {sending ? "..." : "Send"}
                </button>
              </form>
              {sendSuccess && <p className="text-emerald-400 text-xs mt-2">Invite sent!</p>}
              {sendError && <p className="text-red-400 text-xs mt-2">{sendError}</p>}
            </div>

            {pendingInvites.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">Pending Invites</h3>
                <div className="space-y-2">
                  {pendingInvites.map(email => (
                    <div key={email} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-2 border border-white/5 gap-2 min-w-0">
                      <div className="text-sm text-slate-300 truncate pl-2 min-w-0">{email}</div>
                      <button
                        onClick={() => handleRevokeInvite(email)}
                        className="text-xs text-slate-500 hover:text-red-400 transition-colors px-2"
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
