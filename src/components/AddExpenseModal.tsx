"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp, arrayUnion, Timestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { getCurrencySymbol } from "@/lib/currency";

interface UserProfile {
  uid: string;
  displayName: string;
  email: string | null;
}

interface Split {
  userId: string;
  amountOwed: number;
}

interface ExpenseData {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  splitType: string;
  splits: Split[];
  rawInputs?: any; // To recover shares/percentages if we start saving them
}

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  members: string[]; 
  profiles: Record<string, UserProfile>;
  currency: string;
  expenseToEdit?: ExpenseData | null;
}

export default function AddExpenseModal({ isOpen, onClose, groupId, members, profiles, currency, expenseToEdit }: ExpenseModalProps) {
  const { user } = useAuth();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [splitType, setSplitType] = useState<"SHARES" | "EXACT" | "PERCENTAGE">("SHARES");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const currencySymbol = getCurrencySymbol(currency);

  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [shares, setShares] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (expenseToEdit) {
        setDescription(expenseToEdit.description);
        setAmount(expenseToEdit.amount.toString());
        setSplitType(expenseToEdit.splitType as any);

        const initialExact: Record<string, string> = {};
        const initialPercents: Record<string, string> = {};
        const initialShares: Record<string, string> = {};

        // If we have saved raw inputs, use them to perfectly restore state
        if (expenseToEdit.rawInputs) {
          if (expenseToEdit.splitType === "EXACT") {
            Object.assign(initialExact, expenseToEdit.rawInputs);
          } else if (expenseToEdit.splitType === "PERCENTAGE") {
            Object.assign(initialPercents, expenseToEdit.rawInputs);
          } else if (expenseToEdit.splitType === "SHARES") {
            Object.assign(initialShares, expenseToEdit.rawInputs);
          }
        } else {
          // Fallback reconstruction
          expenseToEdit.splits.forEach(split => {
            initialExact[split.userId] = split.amountOwed.toFixed(2);
            initialPercents[split.userId] = ((split.amountOwed / expenseToEdit.amount) * 100).toFixed(2);
            initialShares[split.userId] = "1"; // Fallback to 1 if we can't recover shares
          });
        }
        
        setExactAmounts(initialExact);
        setPercentages(initialPercents);
        setShares(initialShares);

      } else {
        // Default new expense
        setDescription("");
        setAmount("");
        setSplitType("SHARES");
        setExactAmounts({});
        setPercentages({});
        const initialShares: Record<string, string> = {};
        members.forEach(m => initialShares[m] = "1");
        setShares(initialShares);
      }
      setError("");
    }
  }, [isOpen, members, expenseToEdit]);

  if (!isOpen || !user) return null;

  const handleExactChange = (uid: string, val: string) => {
    setExactAmounts(prev => ({ ...prev, [uid]: val }));
  };

  const handlePercentageChange = (uid: string, val: string) => {
    setPercentages(prev => ({ ...prev, [uid]: val }));
  };

  const handleShareChange = (uid: string, val: string) => {
    setShares(prev => ({ ...prev, [uid]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let splits: {userId: string, amountOwed: number}[] = [];
      let rawInputsToSave: Record<string, string> = {};

      if (splitType === "SHARES") {
        let totalShares = 0;
        members.forEach(m => {
          totalShares += parseFloat(shares[m] || "0");
        });

        if (totalShares <= 0) {
          throw new Error("Total shares must be greater than 0.");
        }

        splits = members.map(memberId => {
          const s = parseFloat(shares[memberId] || "0");
          const val = (s / totalShares) * numAmount;
          return { userId: memberId, amountOwed: val };
        });
        rawInputsToSave = shares;
        
      } else if (splitType === "EXACT") {
        let totalExact = 0;
        splits = members.map(memberId => {
          const val = parseFloat(exactAmounts[memberId] || "0");
          totalExact += val;
          return { userId: memberId, amountOwed: val };
        });
        
        if (Math.abs(totalExact - numAmount) > 0.01) {
          throw new Error(`Exact amounts must sum to the total amount. Currently: ${currencySymbol}${totalExact.toFixed(2)}`);
        }
        rawInputsToSave = exactAmounts;

      } else if (splitType === "PERCENTAGE") {
        let totalPercentage = 0;
        splits = members.map(memberId => {
          const p = parseFloat(percentages[memberId] || "0");
          totalPercentage += p;
          const val = numAmount * (p / 100);
          return { userId: memberId, amountOwed: val };
        });

        if (Math.abs(totalPercentage - 100) > 0.01) {
          throw new Error(`Percentages must sum to 100%. Currently: ${totalPercentage}%`);
        }
        rawInputsToSave = percentages;
      }

      const expenseData = {
        groupId,
        description: description.trim(),
        amount: numAmount,
        paidBy: expenseToEdit ? expenseToEdit.paidBy : user.uid, // Keep original payer if editing
        splitType,
        splits,
        rawInputs: rawInputsToSave
      };

      if (expenseToEdit) {
        await updateDoc(doc(db, "expenses", expenseToEdit.id), {
          ...expenseData,
          history: arrayUnion({
            action: 'edited',
            userId: user.uid,
            timestamp: Timestamp.now()
          })
        });
      } else {
        await addDoc(collection(db, "expenses"), {
          ...expenseData,
          date: serverTimestamp(),
          createdAt: serverTimestamp(),
          createdBy: user.uid
        });
      }
      
      onClose();
    } catch (err: any) {
      setError(err.message || `Failed to ${expenseToEdit ? 'update' : 'add'} expense.`);
    } finally {
      setLoading(false);
    }
  };

  const noSpinnersClass = "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl my-auto">
        <h2 className="text-2xl font-bold text-white mb-4">{expenseToEdit ? 'Edit Expense' : 'Add an Expense'}</h2>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">Description</label>
            <input
              id="description"
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
              placeholder="e.g. Dinner, Groceries"
            />
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-slate-300 mb-1">Amount ({currencySymbol})</label>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono text-lg ${noSpinnersClass}`}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Split Type</label>
            <div className="flex gap-2 p-1 bg-slate-800 rounded-lg border border-white/5">
              <button
                type="button"
                onClick={() => setSplitType("SHARES")}
                className={`flex-1 py-2 text-sm rounded-md font-medium transition-colors ${splitType === 'SHARES' ? 'bg-emerald-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}
              >
                Shares
              </button>
              <button
                type="button"
                onClick={() => setSplitType("EXACT")}
                className={`flex-1 py-2 text-sm rounded-md font-medium transition-colors ${splitType === 'EXACT' ? 'bg-emerald-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}
              >
                Exact
              </button>
              <button
                type="button"
                onClick={() => setSplitType("PERCENTAGE")}
                className={`flex-1 py-2 text-sm rounded-md font-medium transition-colors ${splitType === 'PERCENTAGE' ? 'bg-emerald-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}
              >
                Percentage
              </button>
            </div>
            
            <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-2">
              {members.map(uid => (
                <div key={uid} className="flex items-center justify-between bg-slate-800/50 p-2 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold uppercase">
                        {profiles[uid]?.displayName?.[0] || profiles[uid]?.email?.[0] || "U"}
                      </div>
                      <span className="text-sm font-medium">{profiles[uid]?.displayName || profiles[uid]?.email || "Unknown User"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {splitType === "EXACT" && <span className="text-slate-500 text-sm">{currencySymbol}</span>}
                    {splitType === "SHARES" && <span className="text-slate-500 text-sm">x</span>}
                    <input 
                      type="number"
                      step={splitType === "SHARES" ? "1" : "0.01"}
                      min="0"
                      placeholder="0"
                      value={splitType === "EXACT" ? (exactAmounts[uid] || "") : splitType === "PERCENTAGE" ? (percentages[uid] || "") : (shares[uid] || "")}
                      onChange={(e) => {
                        if (splitType === "EXACT") handleExactChange(uid, e.target.value);
                        else if (splitType === "PERCENTAGE") handlePercentageChange(uid, e.target.value);
                        else handleShareChange(uid, e.target.value);
                      }}
                      className={`w-20 bg-slate-900 border border-white/10 rounded-md px-2 py-1 text-sm text-right focus:outline-none focus:border-emerald-500 ${noSpinnersClass}`}
                    />
                    {splitType === "PERCENTAGE" && <span className="text-slate-500 text-sm">%</span>}
                  </div>
                </div>
              ))}
            </div>
            
            {splitType === "SHARES" && (
              <p className="text-xs text-slate-500 mt-2 text-center">
                Total Shares: {members.reduce((acc, curr) => acc + parseFloat(shares[curr] || "0"), 0)}
              </p>
            )}
          </div>

          <div className="flex gap-3 mt-4">
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
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
            >
              {loading ? "Saving..." : expenseToEdit ? "Update Expense" : "Add Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
