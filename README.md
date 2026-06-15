# 💸 Halvsies

**Halvsies** is a premium, ultra-modern web application designed to eliminate the awkwardness of splitting expenses. Whether you're planning a trip with friends, managing household bills, or organizing a dinner party, Halvsies makes tracking shared expenses effortless, transparent, and visually stunning.

![Halvsies UI Concept](https://img.shields.io/badge/UI-Beautiful%20Dark%20Mode-10b981?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-V3-38bdf8?style=for-the-badge&logo=tailwindcss)
![Architecture](https://img.shields.io/badge/Architecture-Backend%20Agnostic-8b5cf6?style=for-the-badge)

## ✨ Why Halvsies?

Traditional expense trackers are clunky and feel like Excel spreadsheets. Halvsies was built from the ground up to feel like a premium financial tool. With a sleek dark-mode aesthetic, emerald green accents, and smooth micro-animations, managing your group's money has never looked this good. 

It is also designed to be **Backend Agnostic**. While it includes a default implementation, the UI and state management logic can easily be wired up to any custom backend, database, or API of your choosing.

### 🚀 Core Features

- **Smart Expense Splitting:** Splitting a bill isn't always even. Halvsies allows you to split by **Shares**, **Exact Amounts**, or **Percentages**. 
- **Auto-Completion Magic:** Enter the exact amount for a few people, and Halvsies will instantly calculate and evenly distribute the remaining balance to anyone left blank.
- **Simplified Debts:** No more "A owes B, B owes C". Halvsies' internal algorithm automatically minimizes the total number of transactions needed to settle up across the entire group.
- **Interactive Visualizations:** Get a bird's-eye view of your group's spending with beautiful cumulative line charts that track your expenses over time.
- **Seamless Group Management:** Easily invite members via email or shareable invite links. A built-in approval system allows group admins to review and accept "Join Requests" before anyone sees the group's finances.
- **Real-Time Ready:** The front-end architecture is built to gracefully handle real-time syncs, ensuring that expenses, group changes, and profile updates can update instantly across all users.

## 🛠 Tech Stack

- **Framework:** [Next.js](https://nextjs.org) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) with custom UI components
- **Icons:** Heroicons
- **Language:** TypeScript
- **Backend:** Agnostic (Bring your own Database / API, or use the included reference implementations)

## 🏁 Getting Started

First, install the dependencies:

```bash
npm install
```

Configure your environment variables in `.env.local` according to your chosen backend implementation.

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🤝 Contributing
Contributions are welcome! If you have an idea to make Halvsies even better or want to add an adapter for a new database, feel free to fork the repository and submit a pull request.

## 📄 License
This project is open-source and available under the MIT License.
