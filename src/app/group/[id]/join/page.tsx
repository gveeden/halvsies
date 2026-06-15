"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import Link from "next/link";

interface GroupData {
  name: string;
  description: string;
  members: string[];
}

export default function JoinGroupPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const groupId = params.id;
  
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [group, setGroup] = useState<GroupData | null>(null);
  const [fetchError, setFetchError] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const groupRef = doc(db, "groups", groupId);
        const docSnap = await getDoc(groupRef);
        
        if (docSnap.exists()) {
          setGroup(docSnap.data() as GroupData);
        } else {
          setFetchError("This group does not exist or has been deleted.");
        }
      } catch (err: any) {
        setFetchError("Unable to fetch group details.");
      }
    };
    
    if (groupId) {
      fetchGroup();
    }
  }, [groupId]);

  useEffect(() => {
    // If not logged in, we set the pending join so the login page knows where to send them back
    if (!loading && !user && groupId) {
      window.localStorage.setItem('pendingGroupJoin', groupId);
      router.push("/login");
    }
  }, [user, loading, groupId, router]);

  const handleJoin = async () => {
    if (!user || !group) return;
    setJoining(true);
    
    try {
      const groupRef = doc(db, "groups", groupId);
      await updateDoc(groupRef, {
        members: arrayUnion(user.uid)
      });
      
      // Clear pending join just in case
      window.localStorage.removeItem('pendingGroupJoin');
      
      // Redirect to the group
      router.push(`/group/${groupId}`);
    } catch (err: any) {
      console.error(err);
      setFetchError("Failed to join the group. Make sure you are logged in.");
      setJoining(false);
    }
  };

  if (loading || !group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // If already a member
  if (user && group.members.includes(user.uid)) {
    router.push(`/group/${groupId}`);
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[20%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10 text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-10 justify-center group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-bold text-xl shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-transform">
            H
          </div>
        </Link>

        <div className="bg-slate-900 border border-white/10 rounded-3xl p-10 shadow-2xl backdrop-blur-xl">
          {fetchError ? (
            <div>
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Oops!</h2>
              <p className="text-slate-400">{fetchError}</p>
              <Link href="/dashboard" className="inline-block mt-8 bg-white/5 hover:bg-white/10 text-white font-medium py-3 px-6 rounded-xl transition-colors border border-white/10">
                Back to Dashboard
              </Link>
            </div>
          ) : (
            <div>
              <h2 className="text-slate-400 font-medium mb-2 uppercase tracking-widest text-sm">You've been invited to</h2>
              <h1 className="text-3xl font-extrabold text-white mb-4">{group.name}</h1>
              {group.description && (
                <p className="text-slate-400 mb-8">{group.description}</p>
              )}
              
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 disabled:opacity-50 text-slate-950 font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 text-lg"
              >
                {joining ? "Joining..." : "Join Group"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
