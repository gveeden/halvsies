"use client";

import { use, useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, collection, query, where, orderBy, getDoc, deleteDoc } from "firebase/firestore";
import Link from "next/link";
import AddExpenseModal from "@/components/AddExpenseModal";
import EditGroupModal from "@/components/EditGroupModal";
import InviteModal from "@/components/InviteModal";
import { calculateSimplifiedDebts, SimplifiedDebt } from "@/lib/settleDebts";
import { getCurrencySymbol } from "@/lib/currency";

interface Group {
  id: string;
  name: string;
  description: string;
  members: string[];
  currency?: string;
}

interface Split {
  userId: string;
  amountOwed: number;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  date: any;
  createdAt: any;
  splitType: string;
  splits: Split[];
  rawInputs?: any;
}

interface UserProfile {
  uid: string;
  displayName: string;
  email: string | null;
}

export default function GroupPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const groupId = params.id;
  
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [groupLoading, setGroupLoading] = useState(true);
  const [expensesLoading, setExpensesLoading] = useState(true);
  
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  
  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"expenses" | "balances">("expenses");

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filteredAndSortedExpenses = useMemo(() => {
    let result = [...expenses];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(e => {
        // Match description
        if (e.description.toLowerCase().includes(query)) return true;
        
        // Match payer name
        const isYouPayer = e.paidBy === user?.uid;
        const payerName = isYouPayer ? "you" : (profiles[e.paidBy]?.displayName?.toLowerCase() || "");
        if (payerName.includes(query)) return true;

        // Match split members
        const splitMembersMatch = e.splits.some(split => {
          const isYouSplit = split.userId === user?.uid;
          const splitName = isYouSplit ? "you" : (profiles[split.userId]?.displayName?.toLowerCase() || "");
          return splitName.includes(query);
        });
        if (splitMembersMatch) return true;

        return false;
      });
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "date") {
        const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        comparison = dateA - dateB;
      } else if (sortBy === "amount") {
        comparison = a.amount - b.amount;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [expenses, searchQuery, sortBy, sortOrder, profiles, user?.uid]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Fetch Group Data
  useEffect(() => {
    if (!user || !groupId) return;

    const groupRef = doc(db, "groups", groupId);
    const unsubscribe = onSnapshot(groupRef, (docSnap) => {
      if (docSnap.exists()) {
        const groupData = { id: docSnap.id, ...docSnap.data() } as Group;
        if (!groupData.members.includes(user.uid)) {
          router.push("/dashboard");
          return;
        }
        setGroup(groupData);
        
        // Fetch profiles for all members
        const fetchProfiles = async () => {
          const profilesData: Record<string, UserProfile> = {};
          await Promise.all(
            groupData.members.map(async (uid) => {
              const userRef = doc(db, "users", uid);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                profilesData[uid] = userSnap.data() as UserProfile;
              } else {
                profilesData[uid] = { uid, displayName: "Unknown User", email: null };
              }
            })
          );
          setProfiles(profilesData);
        };
        fetchProfiles();

      } else {
        router.push("/dashboard");
      }
      setGroupLoading(false);
    }, (error) => {
      console.error("Error fetching group:", error);
      setGroupLoading(false);
    });

    return () => unsubscribe();
  }, [groupId, user, router]);

  // Fetch Expenses
  useEffect(() => {
    if (!user || !groupId) return;

    const q = query(
      collection(db, "expenses"),
      where("groupId", "==", groupId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const expensesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Expense[];
      setExpenses(expensesData);
      setExpensesLoading(false);
    }, (error) => {
      console.error("Error fetching expenses:", error);
      setExpensesLoading(false);
    });

    return () => unsubscribe();
  }, [groupId, user]);

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      await deleteDoc(doc(db, "expenses", expenseId));
    } catch (err) {
      console.error("Failed to delete expense", err);
      alert("Failed to delete expense. Check your permissions.");
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setExpenseToEdit(expense);
    setIsExpenseModalOpen(true);
  };

  const handleOpenAddExpense = () => {
    setExpenseToEdit(null);
    setIsExpenseModalOpen(true);
  };

  if (loading || groupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!group) return null;

  const simplifiedDebts = calculateSimplifiedDebts(expenses);
  const currencySymbol = getCurrencySymbol(group.currency);

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      <header className="bg-slate-900 border-b border-white/5 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </Link>
            <div>
              <h1 className="font-bold tracking-tight text-xl">{group.name}</h1>
              <p className="text-xs text-slate-400">{group.members.length} members</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Members Avatars */}
            <div className="flex -space-x-2">
              {group.members.slice(0, 3).map(uid => (
                <div key={uid} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold uppercase shadow-sm">
                  {profiles[uid]?.displayName?.[0] || profiles[uid]?.email?.[0] || "U"}
                </div>
              ))}
              {group.members.length > 3 && (
                <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-xs font-bold shadow-sm">
                  +{group.members.length - 3}
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setIsInviteModalOpen(true)}
              className="ml-2 text-sm bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-semibold py-1.5 px-3 rounded-full transition-colors border border-emerald-500/20"
            >
              Invite
            </button>
            
            <button 
              onClick={() => setIsEditGroupModalOpen(true)}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 transition-colors"
              title="Group Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-8">
        
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-2xl p-6 mb-8 shadow-xl">
          <p className="text-sm font-medium text-slate-400 mb-1">Total Group Spend</p>
          <h2 className="text-4xl font-extrabold text-white">
            {currencySymbol}{expenses.reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)}
          </h2>
        </div>

        <div className="flex border-b border-white/10 mb-6">
          <button
            onClick={() => setActiveTab("expenses")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === "expenses" ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            Expenses
          </button>
          <button
            onClick={() => setActiveTab("balances")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === "balances" ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            Balances
          </button>
        </div>

        {activeTab === "expenses" && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h3 className="font-semibold text-lg">Recent Expenses</h3>
              <button
                onClick={handleOpenAddExpense}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-2 px-4 rounded-full text-sm transition-all shadow-lg shadow-emerald-500/20"
              >
                + Add Expense
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-6 bg-slate-900/50 p-3 rounded-xl border border-white/5">
              <div className="flex-1 relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "date" | "amount")}
                  className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="date">Sort by Date</option>
                  <option value="amount">Sort by Amount</option>
                </select>
                <button
                  onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                  className="bg-slate-800 border border-white/10 rounded-lg p-2 text-slate-400 hover:text-white transition-colors"
                  title={`Change to ${sortOrder === "asc" ? "descending" : "ascending"}`}
                >
                  {sortOrder === "asc" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {expensesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse bg-slate-800/50 rounded-xl h-20 border border-white/5"></div>
                ))}
              </div>
            ) : filteredAndSortedExpenses.length === 0 ? (
              <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-10 text-center">
                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <p className="text-slate-400">
                  {searchQuery ? "No expenses match your search." : "No expenses yet. Add one to get started!"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAndSortedExpenses.map((expense) => {
                  const dateStr = expense.createdAt?.toDate ? expense.createdAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Just now';
                  const isYou = expense.paidBy === user?.uid;
                  const payerName = isYou ? "You" : (profiles[expense.paidBy]?.displayName?.split(' ')[0] || "Someone");
                  
                  return (
                    <div key={expense.id} className="bg-slate-900 border border-white/5 hover:border-white/10 rounded-xl p-4 flex items-center justify-between transition-colors group">
                      <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 flex-shrink-0 flex flex-col items-center justify-center text-xs font-medium border border-white/5">
                          <span className="text-slate-500 uppercase">{dateStr.split(' ')[0]}</span>
                          <span className="text-white text-lg">{dateStr.split(' ')[1]}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-white truncate">{expense.description}</h4>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">
                            Paid by <span className={isYou ? "text-emerald-400 font-medium" : "text-slate-300 font-medium"}>{payerName}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <div className="font-bold text-lg text-white">{currencySymbol}{expense.amount.toFixed(2)}</div>
                          <p className="text-xs text-slate-500 capitalize">{expense.splitType.toLowerCase()} Split</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleEditExpense(expense)}
                            className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                            title="Edit Expense"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Delete Expense"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "balances" && (
          <div>
            <h3 className="font-semibold text-lg mb-4">How to settle up</h3>
            
            {expensesLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="animate-pulse bg-slate-800/50 rounded-xl h-16 border border-white/5"></div>
                ))}
              </div>
            ) : expenses.length === 0 || simplifiedDebts.length === 0 ? (
              <div className="bg-slate-900/50 border border-emerald-500/10 rounded-2xl p-10 text-center">
                 <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                  </div>
                <h3 className="text-lg font-bold text-emerald-400 mb-1">You're all settled up!</h3>
                <p className="text-slate-400 text-sm">There are no outstanding debts in this group.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {simplifiedDebts.map((debt, idx) => {
                  const fromYou = debt.from === user?.uid;
                  const toYou = debt.to === user?.uid;
                  const fromName = fromYou ? "You" : (profiles[debt.from]?.displayName?.split(' ')[0] || "Someone");
                  const toName = toYou ? "You" : (profiles[debt.to]?.displayName?.split(' ')[0] || "Someone");
                  
                  return (
                    <div key={idx} className="bg-slate-900 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* From Avatar */}
                        <div className="w-10 h-10 rounded-full border border-slate-700 bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-xs font-bold shadow-inner">
                          {fromName[0]}
                        </div>
                        
                        <div className="flex flex-col items-center justify-center px-2">
                           <span className="text-xs text-slate-500 mb-1">owes</span>
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                           </svg>
                        </div>

                        {/* To Avatar */}
                        <div className="w-10 h-10 rounded-full border border-slate-700 bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xs font-bold shadow-inner">
                          {toName[0]}
                        </div>

                        <div className="ml-2 font-medium">
                          <span className={fromYou ? "text-white" : "text-slate-300"}>{fromName}</span>
                          <span className="text-slate-500 mx-1">owes</span>
                          <span className={toYou ? "text-emerald-400" : "text-slate-300"}>{toName}</span>
                        </div>
                      </div>
                      <div className={`font-bold text-lg ${toYou ? 'text-emerald-400' : fromYou ? 'text-red-400' : 'text-white'}`}>
                        {currencySymbol}{debt.amount.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>

      <AddExpenseModal 
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setExpenseToEdit(null);
        }}
        groupId={groupId}
        members={group.members}
        profiles={profiles}
        currency={group.currency || "USD"}
        expenseToEdit={expenseToEdit}
      />

      <EditGroupModal
        isOpen={isEditGroupModalOpen}
        onClose={() => setIsEditGroupModalOpen(false)}
        groupId={groupId}
        currentName={group.name}
        currentDescription={group.description}
        currentCurrency={group.currency}
      />

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        groupId={groupId}
        groupName={group.name}
      />
    </div>
  );
}
