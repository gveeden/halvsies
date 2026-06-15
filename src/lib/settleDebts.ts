interface Split {
  userId: string;
  amountOwed: number;
}

interface Expense {
  id?: string;
  amount: number;
  paidBy: string;
  splits: Split[];
}

export interface SimplifiedDebt {
  from: string; // userId who owes
  to: string;   // userId who is owed
  amount: number;
}

export function calculateSimplifiedDebts(expenses: Expense[]): SimplifiedDebt[] {
  // 1. Calculate net balances for every user
  // Positive balance = they are owed money (Creditor)
  // Negative balance = they owe money (Debtor)
  const balances: Record<string, number> = {};

  expenses.forEach(expense => {
    // The person who paid gets a positive balance increment for the total amount
    balances[expense.paidBy] = (balances[expense.paidBy] || 0) + expense.amount;

    // Every person involved in the split gets a negative balance increment for their share
    expense.splits.forEach(split => {
      balances[split.userId] = (balances[split.userId] || 0) - split.amountOwed;
    });
  });

  // 2. Separate into Debtors and Creditors
  interface Person {
    userId: string;
    balance: number;
  }

  const debtors: Person[] = [];
  const creditors: Person[] = [];

  for (const [userId, balance] of Object.entries(balances)) {
    // Use a small epsilon to avoid floating point precision issues
    if (balance < -0.001) {
      debtors.push({ userId, balance: Math.abs(balance) });
    } else if (balance > 0.001) {
      creditors.push({ userId, balance });
    }
  }

  // Sort them descending by balance amount (optional, but helps greedy algorithm efficiency)
  debtors.sort((a, b) => b.balance - a.balance);
  creditors.sort((a, b) => b.balance - a.balance);

  // 3. Match and Settle (Greedy Approach)
  const simplifiedDebts: SimplifiedDebt[] = [];
  let dIndex = 0;
  let cIndex = 0;

  while (dIndex < debtors.length && cIndex < creditors.length) {
    const debtor = debtors[dIndex];
    const creditor = creditors[cIndex];

    const settleAmount = Math.min(debtor.balance, creditor.balance);

    // Record the debt
    // Round to 2 decimal places to avoid floating point anomalies in UI
    simplifiedDebts.push({
      from: debtor.userId,
      to: creditor.userId,
      amount: Math.round(settleAmount * 100) / 100
    });

    // Adjust balances
    debtor.balance -= settleAmount;
    creditor.balance -= settleAmount;

    // If a balance becomes ~0, move to the next person
    if (debtor.balance < 0.001) {
      dIndex++;
    }
    if (creditor.balance < 0.001) {
      cIndex++;
    }
  }

  return simplifiedDebts;
}
