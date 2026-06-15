"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from "firebase/firestore";
import CreateGroupModal from "@/components/CreateGroupModal";
import ProfileModal from "@/components/ProfileModal";
import Link from "next/link";

interface Group {
  id: string;
  name: string;
  description: string;
  members: string[];
  pendingInvites?: string[];
  joinRequests?: string[];
}

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Fetch real-time display name from users collection since AuthContext might have stale data
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists() && docSnap.data().displayName) {
        setDisplayName(docSnap.data().displayName);
      } else {
        setDisplayName(user.displayName || "");
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "groups"),
      where("members", "array-contains", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const groupsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Group[];
      const activeGroups = groupsData.filter(g => !(g as any).deletedAt);
      setGroups(activeGroups);
      setGroupsLoading(false);
    }, (error) => {
      console.error("Error fetching groups:", error);
      setGroupsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading || (!user && !loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      {/* Header */}
      <header className="bg-slate-900 border-b border-white/5 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-bold shadow-lg shadow-emerald-500/30">
              H
            </div>
            <span className="font-bold tracking-tight text-xl">Halvsies</span>
          </Link>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-sm font-bold uppercase shadow-inner hover:ring-2 ring-emerald-500 transition-all"
              title="Edit Profile"
            >
              {displayName?.[0] || user?.email?.[0] || "U"}
            </button>
            <button onClick={signOut} className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {displayName ? displayName.split(' ')[0] : (user?.email?.split('@')[0] || "Friend")}!</h1>
          <p className="text-slate-400">Here's where you stand.</p>
        </div>



        {/* Groups Section */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Your Groups</h2>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold py-2 px-4 rounded-xl transition-all shadow-md shadow-emerald-500/20 text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            New Group
          </button>
        </div>

        {groupsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-slate-800/50 rounded-2xl h-32 border border-white/5"></div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-10 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
            <p className="text-slate-400 mb-6 max-w-sm">Create a group to start tracking expenses with your friends, family, or roommates.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-white/10 hover:bg-white/20 border border-white/10 text-white font-medium py-2.5 px-6 rounded-full transition-colors"
            >
              Create your first group
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map(group => (
              <Link 
                href={`/group/${group.id}`} 
                key={group.id}
                className="block bg-slate-900 border border-white/5 hover:border-emerald-500/50 hover:bg-slate-800/80 rounded-2xl p-5 transition-all group"
              >
                <h3 className="font-semibold text-lg mb-1 group-hover:text-emerald-400 transition-colors">{group.name}</h3>
                <p className="text-sm text-slate-400 line-clamp-2 mb-4">{group.description || 'No description'}</p>
                
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{group.members.length} {group.members.length === 1 ? 'member' : 'members'}</span>
                  <span className="flex items-center text-emerald-400 font-medium">
                    View
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <CreateGroupModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
          // The onSnapshot listener will automatically update the UI
        }}
      />
      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
    </div>
  );
}
