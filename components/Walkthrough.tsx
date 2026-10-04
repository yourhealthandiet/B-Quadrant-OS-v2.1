import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  ArrowLeft, 
  Search, 
  BookOpen, 
  Lightbulb, 
  Download, 
  Sparkles, 
  RotateCcw, 
  Check, 
  Compass,
  User,
  Briefcase
} from 'lucide-react';

export interface TourStepDetails {
    title?: string;
    content?: string;
    usage?: string;
    significance?: string;
}

export interface TourStep {
    id: string;
    target: string;
    title: string;
    content: string;
    usage: string;
    significance: string;
    category?: 'getting_started' | 'cashflow' | 'balance_sheet' | 'quadrant' | 'operations';
    scope?: 'personal' | 'business' | 'both';
    personal?: TourStepDetails;
    business?: TourStepDetails;
}

export const ONBOARDING_CONTENT: TourStep[] = [
    { 
      id: 'welcome', 
      target: 'app-logo', 
      category: 'getting_started',
      scope: 'both',
      title: 'Welcome to Your Financial System', 
      content: 'This app helps you manage your personal money and all your businesses in one place.\n\nIt gives you full clarity on what you earn, what you spend, what you own, and what you owe.\n\nThe goal is simple: to help you build real financial freedom so your money works for you, instead of you working forever for money.', 
      usage: 'Use the menu on the left to move between your Dashboard, Income Statement, Assets, Goals, and Settings.', 
      significance: 'True wealth comes from keeping your money organized and knowing where every penny goes.',
      personal: {
        title: 'Welcome to Your Personal Financial Dashboard',
        content: 'This profile tracks your personal household money, your family budget, your private investments, and your living expenses.\n\nKeeping your personal money strictly here gives you complete clarity on your true personal net worth.',
        usage: 'Use this personal view to manage your everyday life, personal savings, and retirement goals.',
        significance: 'Clear personal records ensure you live comfortably and build lasting family wealth.'
      },
      business: {
        title: 'Welcome to Your Business Command Center',
        content: 'You are currently inside an active business profile.\n\nThis account tracks customer revenues, operating expenses, employee payroll, and net company profits.\n\nAlways run business transactions here so they never mix with your personal life.',
        usage: 'Use this business view to manage client invoices, company expenses, and partner distributions.',
        significance: 'Clean corporate books protect your liability and prove whether your business is truly profitable.'
      }
    },
    { 
      id: 'theme-selection', 
      target: 'theme-toggle', 
      category: 'getting_started',
      scope: 'both',
      title: 'Dark and Light Mode', 
      content: 'You can easily switch how the app looks depending on your preference or room lighting.\n\nThe dark theme is easy on the eyes, especially at night or when looking at your phone for a long time.', 
      usage: 'Tap the Sun or Moon icon in the top toolbar to switch between dark mode and light mode anytime.', 
      significance: 'Choose whatever theme is most comfortable for your eyes.' 
    },
    { 
      id: 'context', 
      target: 'profile-switcher', 
      category: 'getting_started',
      scope: 'both',
      title: 'Personal vs Business Accounts', 
      content: 'Always keep your personal money separate from your business money.\n\nMixing personal cash with business money causes confusion and makes it impossible to see if your business is truly profitable.', 
      usage: 'Tap the profile name in the top bar to switch between your Personal account and your Business accounts. Each one has its own separate books.', 
      significance: 'Keeping clean boundaries protects your money and keeps your business safe.' 
    },
    { 
      id: 'privacy-toggle', 
      target: 'privacy-toggle', 
      category: 'getting_started',
      scope: 'both',
      title: 'Hide or Show Your Balances', 
      content: 'Need privacy while in public, in a cafe, or showing your screen to a friend?\n\nYou can hide all your money numbers with a single tap.', 
      usage: 'Tap the Eye icon in the top toolbar. Your numbers will change to stars (****). Tap it again whenever you want to see your numbers.', 
      significance: 'Keeps your financial numbers private from people looking over your shoulder.' 
    },
    { 
      id: 'kpis', 
      target: 'dashboard-kpis', 
      category: 'getting_started',
      scope: 'both',
      title: 'Your Key Money Numbers', 
      content: 'At the top of your dashboard, you will see your most important financial numbers at a glance.\n\nThis includes your Net Worth (everything you own minus everything you owe), your total income, and your savings.', 
      usage: 'Check these cards regularly to see if your money is growing month after month.', 
      significance: 'When you track your numbers, you make better decisions and build wealth faster.',
      personal: {
        title: 'Your Personal Wealth Scoreboard',
        content: 'Shows your personal Net Worth (what your household owns minus your personal debts), your emergency cash reserve, and your monthly savings rate.',
        usage: 'Check these cards each week to make sure your family wealth is growing steadily.',
        significance: 'Tracking personal net worth keeps you focused on building long-term financial security.'
      },
      business: {
        title: 'Company Health & Profit Scoreboard',
        content: 'Shows this company\'s total valuation, operating cash in the bank, monthly burn rate, and profit margin.',
        usage: 'Monitor these numbers to guarantee the company has sufficient operating runway and stays profitable.',
        significance: 'Understanding company cash runway prevents cash crunches and fuels strategic business growth.'
      }
    },
    { 
      id: 'freedom', 
      target: 'freedom-bar', 
      category: 'getting_started',
      scope: 'both',
      title: 'Your Freedom Score', 
      content: 'This score shows how close you are to total financial freedom!\n\nIt compares the passive money you make (from investments and business profits) against your monthly living expenses.', 
      usage: 'When this bar reaches 100%, it means your money earns enough to pay for your entire life without you needing to work a job.', 
      significance: 'Financial freedom means owning your time and doing what you love.',
      personal: {
        title: 'Your Personal Freedom Score',
        content: 'Compares your monthly passive income (from investments, real estate, and business dividends) against your household living expenses.\n\nWhen this hits 100%, you never have to work a day job again.',
        usage: 'Add cash-flowing assets to your balance sheet to push this gauge toward 100%.',
        significance: 'When your investment income exceeds your living expenses, you own your time 100%.'
      },
      business: {
        title: 'Company Profit & Distribution Capacity',
        content: 'Measures how much net profit this business generates beyond its operating bills.\n\nHigh profits mean you can safely pay dividends to owners or reinvest in company expansion.',
        usage: 'Watch this gauge to see how efficiently your sales turn into cash that can be distributed to owners.',
        significance: 'Profitable businesses produce the excess cash flow that funds your personal freedom.'
      }
    },
    { 
      id: 'pocket', 
      target: 'pocket-cards', 
      category: 'getting_started',
      scope: 'both',
      title: 'Cash in Your Pocket', 
      content: 'This shows the actual spending money you have available right now in cash and bank accounts.\n\nIt is separated from money locked up in buildings, cars, or long-term investments.', 
      usage: 'Check your liquid cash balance before making big purchases to ensure you never run short.', 
      significance: 'Cash on hand gives you peace of mind and handles unexpected emergencies.',
      personal: {
        title: 'Personal Spending & Emergency Cash',
        content: 'The liquid money sitting in your personal bank accounts for groceries, bills, and emergency peace of mind.',
        usage: 'Keep 3 to 6 months of living expenses here before putting extra cash into long-term investments.',
        significance: 'An emergency cash cushion protects you from going into debt when unexpected life events happen.'
      },
      business: {
        title: 'Business Operating Cash Reserves',
        content: 'Liquid cash in your company checking accounts to cover next month\'s payroll, office rent, and supplier invoices.',
        usage: 'Check this cash balance before making large equipment purchases or approving bonuses.',
        significance: 'Cash flow is the oxygen of any business. Having healthy reserves ensures your company survives slow months.'
      }
    },
    { 
      id: 'nav-income', 
      target: 'nav-income', 
      category: 'cashflow',
      scope: 'both',
      title: 'Income Statement (Money In & Out)', 
      content: 'The Income Statement is your record book of all the money that enters or leaves your hands.\n\nIt shows all your earnings, everyday expenses, transfers, and profits in one clean timeline.', 
      usage: 'Go here to see where your money came from this month and exactly where it went.', 
      significance: 'Seeing every expense clearly stops money from quietly disappearing.',
      personal: {
        title: 'Personal Cash Flow Log',
        content: 'Your household record of salary, freelance income, grocery bills, rent, utilities, and lifestyle spending.',
        usage: 'Review this monthly to see what percentage of your paycheck you kept and saved.',
        significance: 'Catching personal spending leaks early is the fastest way to save more money.'
      },
      business: {
        title: 'Business Profit & Loss (P&L)',
        content: 'Your company\'s official revenue and expense statement. Shows client sales, vendor payments, marketing, and payroll.',
        usage: 'Filter by month or quarter to evaluate your operating margin and net profit.',
        significance: 'Clean P&L records make tax season effortless and allow you to qualify for commercial bank loans.'
      }
    },
    { 
      id: 'action-add-income', 
      target: 'action-add-income', 
      category: 'cashflow',
      scope: 'both',
      title: 'Adding New Income', 
      content: 'Whenever you get paid — from a salary, client payment, or sales — record it here.\n\nYou can also have the app automatically split that money into savings, taxes, and spending buckets.', 
      usage: 'Click "+ Add Income", type the amount, and write a quick note describing where the money came from.', 
      significance: 'Saving and setting aside taxes as soon as money comes in ensures you never get caught unprepared.',
      personal: {
        title: 'Record Personal Earnings',
        content: 'Log your monthly salary, side hustle income, freelance payments, or dividends received into your personal account.',
        usage: 'Click "+ Add Income" and assign it to your personal savings or living expense buckets.',
        significance: 'Recording all income ensures every dollar has a clear purpose.'
      },
      business: {
        title: 'Log Company Sales & Revenue',
        content: 'Record customer payments, project retainers, sales revenue, or contract milestones.',
        usage: 'Click "+ Add Income" and let the app split it across your Tax, Operating, and Profit buckets.',
        significance: 'Immediately reserving taxes and profit from every sale guarantees company longevity.'
      }
    },
    { 
      id: 'add-expense', 
      target: 'add-expense', 
      category: 'cashflow',
      scope: 'both',
      title: 'Recording Expenses', 
      content: 'Track what you spend on food, rent, bills, staff, or business supplies.\n\nEach expense comes out of a specific money bucket so you never overspend your budget.', 
      usage: 'Click "+ Add Expense", enter the amount, and pick which bucket or category pays for it.', 
      significance: 'Writing down your expenses keeps you in full control of your budget.',
      personal: {
        title: 'Log Personal Expenses',
        content: 'Record household groceries, rent, utilities, dining out, subscriptions, and family shopping.',
        usage: 'Click "+ Add Expense" and select which personal budget bucket will cover the cost.',
        significance: 'Staying within your personal budget leaves plenty of room to invest and grow.'
      },
      business: {
        title: 'Log Operating Costs (OPEX)',
        content: 'Record software subscriptions, contractor fees, office supplies, advertising spend, and team payroll.',
        usage: 'Click "+ Add Expense" and deduct it from your Operating Expense bucket.',
        significance: 'Disciplined company spending protects your profit margins and increases business valuation.'
      }
    },
    { 
      id: 'add-transfer', 
      target: 'add-transfer', 
      category: 'cashflow',
      scope: 'both',
      title: 'Moving Money Between Accounts', 
      content: 'Need to move cash from your business to your personal account, or between two different accounts?\n\nTransfers move money cleanly without counting as new income or an extra expense.', 
      usage: 'Click "+ Transfer", choose where the money is coming from and where it is going.', 
      significance: 'Keeps your books balanced and honest when shifting cash around.' 
    },
    { 
      id: 'add-distribution', 
      target: 'add-distribution', 
      category: 'cashflow',
      scope: 'business',
      title: 'Paying Yourself Business Profits', 
      content: 'When your business makes good profit, you can pay that money out to yourself as the owner.\n\nThis takes cash out of the business and deposits it safely into your personal account.', 
      usage: 'In your Business view, click "Distribute Profit" to pay out dividends to the owners.', 
      significance: 'Rewarding yourself from business profits is why you became a business owner in the first place.',
      personal: {
        title: 'Owner Dividends Received',
        content: 'Shows profits sent from your businesses into your personal hands.\n\nTo initiate a dividend payout, switch to that specific Business profile.',
        usage: 'When a business distributes profit, it shows up here automatically as personal dividend income.',
        significance: 'Owner dividends are how you harvest wealth from your businesses without taking huge taxable salaries.'
      },
      business: {
        title: 'Distribute Profit to Owners',
        content: 'Pay out accumulated company profits to yourself and other shareholders based on ownership percentages.',
        usage: 'Click "Distribute Profit" to automatically split and transfer cash to owners\' personal accounts.',
        significance: 'Rewarding owners with real cash dividends is the ultimate measure of a thriving business.'
      }
    },
    { 
      id: 'filter-transactions', 
      target: 'filter-transactions', 
      category: 'cashflow',
      scope: 'both',
      title: 'Finding and Filtering Records', 
      content: 'Easily search through your past transactions by date, category, or person.\n\nYou can quickly find a receipt from last month or check how much you spent on groceries.', 
      usage: 'Use the search and filter buttons at the top of the Income Statement to filter down to what you need.', 
      significance: 'Instant search saves you hours of digging through old bank receipts.' 
    },
    { 
      id: 'recurring-income-modal', 
      target: 'recurring-income-modal', 
      category: 'cashflow',
      scope: 'both',
      title: 'Recurring Monthly Income', 
      content: 'Do you have money that arrives every month like clockwork — such as a salary, rent from tenants, or client retainers?\n\nSet them up once, and the app tracks them for you automatically.', 
      usage: 'Open Recurring Models in the Income Statement to add, pause, or view your regular monthly income.', 
      significance: 'Steady monthly income gives you stability and helps you plan your future with confidence.' 
    },
    { 
      id: 'dashboard-time-toggles', 
      target: 'dashboard-time-toggles', 
      category: 'cashflow',
      scope: 'both',
      title: 'Changing Time Views', 
      content: 'You can look at your numbers across different periods: today (24 hours), the past 7 days, this month (30 days), this whole year, or all-time.', 
      usage: 'Tap the time buttons at the top of your dashboard to switch between short-term and long-term views.', 
      significance: 'Looking at short periods helps with daily cash, while looking at the whole year shows big-picture growth.' 
    },
    { 
      id: 'nav-balance', 
      target: 'nav-balance', 
      category: 'balance_sheet',
      scope: 'both',
      title: 'Balance Sheet (What You Own & Owe)', 
      content: 'Your Balance Sheet lists everything valuable you own (Assets) and everything you owe to others (Liabilities).\n\nThe difference between the two is your true Net Worth.', 
      usage: 'Visit the Balance Sheet tab to see your total wealth picture in one simple view.', 
      significance: 'Rich people focus on building assets that grow in value, not just collecting a paycheck.',
      personal: {
        title: 'Personal Balance Sheet (Assets & Debts)',
        content: 'Lists your family home, cars, investment portfolio, and crypto, minus personal loans and credit cards.',
        usage: 'Review this tab to ensure your personal assets are outpacing your personal debts.',
        significance: 'Your personal net worth is the real scorecard of your family\'s financial strength.'
      },
      business: {
        title: 'Company Balance Sheet (Assets & Debts)',
        content: 'Lists company equipment, inventory, computers, intellectual property, and receivables, minus loans and debt.',
        usage: 'Review this before applying for business credit lines or meeting with investors.',
        significance: 'A strong company balance sheet provides borrowing power and builds high resale value.'
      }
    },
    { 
      id: 'action-add-asset', 
      target: 'action-add-asset', 
      category: 'balance_sheet',
      scope: 'both',
      title: 'Adding Assets (Things That Make Money)', 
      content: 'An asset is anything that puts money in your pocket or grows in value — like rental property, stocks, machinery, or gold.', 
      usage: 'Click "+ Add Asset", write what it is, what it is worth today, and any monthly income it brings in.', 
      significance: 'Every asset you add brings you one step closer to not needing a day job.',
      personal: {
        title: 'Add Personal Wealth Assets',
        content: 'Add rental apartments, stock index funds, retirement accounts, or precious metals.',
        usage: 'Click "+ Add Asset" and enter what it is worth today and its monthly dividend or rental yield.',
        significance: 'Personal assets work around the clock so you don\'t have to work forever.'
      },
      business: {
        title: 'Add Company Productive Assets',
        content: 'Add commercial machinery, vehicles, software code, patents, or high-value inventory.',
        usage: 'Click "+ Add Asset" and record the asset\'s purchase price and current value.',
        significance: 'Productive business assets allow your team to generate higher revenue per hour.'
      }
    },
    { 
      id: 'action-add-liability', 
      target: 'action-add-liability', 
      category: 'balance_sheet',
      scope: 'both',
      title: 'Adding Debts & Loans', 
      content: 'Keep track of loans, credit cards, mortgages, or money borrowed from friends or partners.\n\nTracking debt helps you see exactly what you owe and plan to pay it off fast.', 
      usage: 'Click "+ Add Liability", enter how much you owe, the interest rate, and your monthly payment.', 
      significance: 'Knowing your exact debt lets you pay it down systematically so you can become debt-free.',
      personal: {
        title: 'Track Personal Debts',
        content: 'Log your home mortgage, car loan, student loans, or personal credit cards.',
        usage: 'Click "+ Add Liability" to log balances, interest rates, and required monthly payments.',
        significance: 'Eliminating personal high-interest debt instantly frees up cash to invest in assets.'
      },
      business: {
        title: 'Manage Company Loans & Debt',
        content: 'Log commercial mortgages, equipment financing, lines of credit, or supplier debts.',
        usage: 'Click "+ Add Liability" to keep track of debt payments and repayment deadlines.',
        significance: 'Smart business leverage can accelerate growth, but unmonitored debt kills companies.'
      }
    },
    { 
      id: 'balance-sheet-true-view', 
      target: 'balance-sheet-true-view', 
      category: 'balance_sheet',
      scope: 'both',
      title: 'True Business Value View', 
      content: 'Standard accounting only counts equipment and cash in the bank.\n\nTrue View also calculates what your businesses could sell for on the open market based on their annual profits.', 
      usage: 'Flip the switch on the Balance Sheet to toggle between standard book value and estimated market value.', 
      significance: 'Gives you an accurate picture of what your hard work has actually built.' 
    },
    { 
      id: 'nav-ownership-graph', 
      target: 'nav-ownership-graph', 
      category: 'balance_sheet',
      scope: 'both',
      title: 'Visual Ownership Map', 
      content: 'If you own multiple companies or share ownership with partners, this page draws a clear visual map connecting them all together.', 
      usage: 'Click on the nodes in the map to see who owns what percentage of each business.', 
      significance: 'Prevents confusion between partners and keeps company ownership crystal clear.' 
    },
    { 
      id: 'nav-goals', 
      target: 'nav-goals', 
      category: 'balance_sheet',
      scope: 'both',
      title: 'Your Money Goals', 
      content: 'Whether you are saving for an emergency fund, a new car, a home, or a dream vacation, set your targets here.\n\nThe app tracks your progress bar as you save money toward each goal.', 
      usage: 'Click "+ Add Goal", enter your target amount, and set a date you want to reach it.', 
      significance: 'Having a clear target makes saving exciting and helps you reach your dreams faster.',
      personal: {
        title: 'Personal Savings Goals',
        content: 'Set targets for an emergency fund, family vacation, home down-payment, or children\'s education.',
        usage: 'Create a goal and watch the progress bar fill up as you save each month.',
        significance: 'Clear personal goals keep you motivated and stop impulse spending.'
      },
      business: {
        title: 'Company Financial Targets',
        content: 'Set targets for 6 months of payroll runway, new equipment purchases, or market expansion funds.',
        usage: 'Link business goals to your company reserve buckets to save for strategic growth.',
        significance: 'Milestones keep your business focused on sustainable expansion rather than random spending.'
      }
    },
    { 
      id: 'action-add-goal', 
      target: 'action-add-goal', 
      category: 'balance_sheet',
      scope: 'both',
      title: 'Creating a New Target', 
      content: 'Give your savings a clear name and purpose.\n\nYou can link a goal to one of your savings buckets so money flows in automatically.', 
      usage: 'Set a goal name, target amount, and see your progress percentage update in real time.', 
      significance: 'Money saved with a purpose rarely gets spent on impulse buys.' 
    },
    { 
      id: 'nav-quadrant', 
      target: 'nav-quadrant', 
      category: 'quadrant',
      scope: 'both',
      title: 'The Cashflow Quadrant', 
      content: 'Based on Robert Kiyosaki\'s famous lesson:\n• E = Employee (trading time for wages)\n• S = Self-Employed (you own a job)\n• B = Business Owner (a system and team work for you)\n• I = Investor (your money works for you)', 
      usage: 'Check your quadrant score. As you build automated businesses and investments, your score moves toward B and I.', 
      significance: 'Moving from E and S to B and I is the true secret to working less and earning more.' 
    },
    { 
      id: 'dashboard-valuation-mode', 
      target: 'dashboard-valuation-mode', 
      category: 'quadrant',
      scope: 'business',
      title: 'Valuing Your Business', 
      content: 'See how much your business is worth using two different methods: what it owns in cash/gear, or a multiple of its annual earnings.', 
      usage: 'Switch valuation modes on your business dashboard to see conservative vs optimistic market estimates.', 
      significance: 'Helps you know what your business is worth if you ever decide to sell or take on investors.' 
    },
    { 
      id: 'nav-dashboard-bus', 
      target: 'nav-dashboard-bus', 
      category: 'quadrant',
      scope: 'business',
      title: 'Business Command Center', 
      content: 'A dedicated control room for your company.\n\nSee monthly sales, staff payroll, profit margins, and how many months of cash runway you have left in the bank.', 
      usage: 'Switch to your business profile to view its specific sales and expenses.', 
      significance: 'Running your business with clear numbers prevents cash crunches and keeps you profitable.' 
    },
    { 
      id: 'dashboard-bus-payout', 
      target: 'dashboard-bus-payout', 
      category: 'quadrant',
      scope: 'business',
      title: 'Distributing Profit to Partners', 
      content: 'When your business has excess profit in its account, you can divide it up and send each partner their fair share.', 
      usage: 'Click "Distribute Profit to Owners" to automatically split the money according to each partner\'s percentage.', 
      significance: 'Guarantees that owners get paid without arguments or manual math.' 
    },
    { 
      id: 'business-tab-triangle', 
      target: 'business-tab-triangle', 
      category: 'quadrant',
      scope: 'business',
      title: 'Business Health Checklist', 
      content: 'Grade your business across 8 key areas: leadership, team, cash flow, communication, systems, legal protection, and your product.', 
      usage: 'Rate each area from 1 to 10 in Business Settings to see where your business is strong and where it needs work.', 
      significance: 'Fixing weak spots in your systems keeps your business running smoothly even when you take a vacation.' 
    },
    { 
      id: 'nav-analytics', 
      target: 'nav-analytics', 
      category: 'quadrant',
      scope: 'both',
      title: 'Charts & Growth Trends', 
      content: 'See visual charts showing whether your wealth is climbing over time.\n\nCompare what you earned this month against previous months to spot patterns.', 
      usage: 'Visit the Analytics tab to view simple, colorful charts of your financial journey.', 
      significance: 'Pictures and charts make it easy to spot trends that numbers alone might hide.' 
    },
    { 
      id: 'nav-learning', 
      target: 'nav-learning', 
      category: 'quadrant',
      scope: 'both',
      title: 'Money Lessons & Handbooks', 
      content: 'Read bite-sized guides on how wealth works, smart tax habits, and how to build profitable systems.', 
      usage: 'Browse the Learning tab anytime you want quick financial wisdom or download the full manual.', 
      significance: 'The best investment you can ever make is in your own financial knowledge.' 
    },
    { 
      id: 'nav-ai', 
      target: 'nav-ai', 
      category: 'quadrant',
      scope: 'both',
      title: 'Your Smart Money Advisor', 
      content: 'Have a question about your numbers? Ask your built-in financial advisor.\n\nIt looks at your real income and expenses to give you practical, personalized tips.', 
      usage: 'Type any question in the AI Advisor tab — like "How can I save more this month?" or "Can I afford this loan?"', 
      significance: 'Get friendly financial advice 24/7 without paying expensive consulting fees.' 
    },
    { 
      id: 'nav-settings', 
      target: 'nav-settings', 
      category: 'operations',
      scope: 'both',
      title: 'Settings & Preferences', 
      content: 'Control your accounts, change your money buckets, add staff members, and back up your data.', 
      usage: 'Go to Settings anytime you want to change your profile details, currency, or password.', 
      significance: 'Customize everything so the app works exactly the way you want it to.' 
    },
    { 
      id: 'section-allocations', 
      target: 'section-allocations', 
      category: 'operations',
      scope: 'both',
      title: 'Money Buckets (Divide & Conquer)', 
      content: 'Divide your incoming money into separate buckets before you spend a dime (for example: 50% Living Expenses, 20% Savings, 20% Taxes, 10% Fun).\n\nThis is inspired by the famous "Profit First" method.', 
      usage: 'Set your bucket percentages in Settings. When new money arrives, the app splits it automatically.', 
      significance: 'You will never accidentally spend your tax money or savings because they are safely set aside first.',
      personal: {
        title: 'Personal Money Buckets',
        content: 'Divide your personal income into buckets (e.g. 50% Living Needs, 20% Savings, 20% Investments, 10% Fun).',
        usage: 'Set your percentages in Settings. The app splits incoming salary automatically.',
        significance: 'Guarantees you pay yourself first before your lifestyle consumes your paycheck.'
      },
      business: {
        title: 'Profit First Business Buckets',
        content: 'Divide company sales into dedicated accounts: Operating Expenses, Taxes, and Owner Profit Reserves.',
        usage: 'Adjust your business bucket percentages in Settings to match your industry margins.',
        significance: 'Securing taxes and profit first prevents your business from ever running out of tax money.'
      }
    },
    { 
      id: 'action-add-entity', 
      target: 'action-add-entity', 
      category: 'operations',
      scope: 'business',
      title: 'Adding a New Business', 
      content: 'Run more than one business, side hustle, or rental property?\n\nYou can add as many companies as you want and manage them all from one login.', 
      usage: 'Click "Add Business Entity" in Settings, give it a name, and select its currency.', 
      significance: 'Keeps all your ventures neat, organized, and easy to review in one place.' 
    },
    { 
      id: 'business-tab-basic', 
      target: 'business-tab-basic', 
      category: 'operations',
      scope: 'business',
      title: 'Business Details', 
      content: 'Set up basic information for your company, including its legal structure (LLC, Sole Proprietor, Corporation) and currency.', 
      usage: 'Update your company name and details in Settings under the Businesses tab.', 
      significance: 'Ensures your reports and financial statements are accurate and ready for tax time.' 
    },
    { 
      id: 'business-tab-ownership', 
      target: 'business-tab-ownership', 
      category: 'operations',
      scope: 'business',
      title: 'Owner Shares & Percentages', 
      content: 'List who owns what percentage of the company (for example: You 70%, Partner 30%).', 
      usage: 'Enter the ownership percentages so the app knows how to split future profits.', 
      significance: 'Clear ownership agreements prevent misunderstandings and keep business relationships strong.' 
    },
    { 
      id: 'business-tab-team', 
      target: 'business-tab-team', 
      category: 'operations',
      scope: 'business',
      title: 'Your Team Members', 
      content: 'Keep a list of your managers, staff, or assistants who help run the day-to-day operations.', 
      usage: 'Add team members and assign what they are allowed to see or edit in the app.', 
      significance: 'Helps you build a team that runs the business smoothly without your constant attention.' 
    },
    { 
      id: 'business-tab-allocations', 
      target: 'business-tab-allocations', 
      category: 'operations',
      scope: 'business',
      title: 'Company Money Buckets', 
      content: 'Just like your personal money, set up buckets for your business (such as Operating Costs, Taxes, and Owner Profit).', 
      usage: 'Adjust your business bucket percentages in Settings to make sure bills are always covered.', 
      significance: 'Guarantees your business stays profitable and never runs out of cash for payroll.' 
    },
    { 
      id: 'business-connect-api', 
      target: 'business-connect-api', 
      category: 'operations',
      scope: 'business',
      title: 'Sync Across Devices', 
      content: 'Want to share records with a partner on their phone or tablet without creating an online account?\n\nUse secure sync tokens to connect devices directly.', 
      usage: 'Generate a sync token in Settings and enter it on your other device to link them.', 
      significance: 'Keeps you and your partners on the exact same page at all times.' 
    },
    { 
      id: 'simulated-user', 
      target: 'simulated-user', 
      category: 'operations',
      scope: 'business',
      title: 'Test What Staff Can See', 
      content: 'Curious what an assistant or staff member sees when they log in?\n\nYou can preview the app from their eyes to make sure private owner numbers stay hidden.', 
      usage: 'Choose a team role to preview the app as that person, and switch back to Owner anytime.', 
      significance: 'Keeps sensitive financial numbers private from staff while letting them do their work.' 
    },
    { 
      id: 'section-snapshots', 
      target: 'section-snapshots', 
      category: 'operations',
      scope: 'both',
      title: 'Automatic Backups', 
      content: 'The app automatically saves a full backup of your records every 50 minutes.\n\nYou can also take a backup snapshot manually anytime before making big changes.', 
      usage: 'Go to Settings to view past snapshots. If you make a mistake, tap "Restore System" to undo it immediately.', 
      significance: 'You never have to worry about losing data or making an accidental mistake.' 
    },
    { 
      id: 'action-undo', 
      target: 'action-undo', 
      category: 'operations',
      scope: 'both',
      title: 'Undo Any Mistake', 
      content: 'Deleted the wrong transaction? Made a typo?\n\nHit the Undo button (↩) in the top toolbar to immediately reverse your last action.', 
      usage: 'Tap the left curved arrow in the top toolbar anytime you want to undo something.', 
      significance: 'Work with total peace of mind knowing you can always take back an accidental tap.' 
    },
    { 
      id: 'action-redo', 
      target: 'action-redo', 
      category: 'operations',
      scope: 'both',
      title: 'Redo What You Undid', 
      content: 'Changed your mind after hitting Undo?\n\nTap the Redo button (↪) to bring the action back immediately.', 
      usage: 'Tap the right curved arrow in the top toolbar to restore an undone action.', 
      significance: 'Gives you complete control to move backward and forward in time.' 
    },
    { 
      id: 'section-data-backup', 
      target: 'section-data-backup', 
      category: 'operations',
      scope: 'both',
      title: 'Download Your Data', 
      content: 'Your financial data belongs 100% to you.\n\nYou can download a full backup copy to your phone or computer with a single click.', 
      usage: 'Go to Settings -> Data Management and tap "Download Backup".', 
      significance: 'Your records are always safe with you, even if you switch phones or clear your browser.' 
    },
    { 
      id: 'section-receipts', 
      target: 'section-receipts', 
      category: 'operations',
      scope: 'both',
      title: 'Print Statements & PDFs', 
      content: 'Need a clean financial statement for your bank, a loan officer, or a business partner?\n\nCreate professional PDF reports ready to print or email.', 
      usage: 'Download PDF financial summaries and loan agreements directly from Settings.', 
      significance: 'Professional paperwork builds credibility with banks and helps you secure loans.' 
    },
    { 
      id: 'calculator', 
      target: 'calculator', 
      category: 'operations',
      scope: 'both',
      title: 'Built-in Calculator', 
      content: 'Need to add up receipts or calculate percentages?\n\nA handy calculator is always available in the corner of your screen.', 
      usage: 'Tap the floating calculator icon in the bottom right corner anytime.', 
      significance: 'Do quick math right inside the app without switching back and forth to another app.' 
    },
    { 
      id: 'currency-switch', 
      target: 'currency-switch', 
      category: 'operations',
      scope: 'both',
      title: 'Switch Your Currency', 
      content: 'View your money in any currency you choose — Naira (NGN), US Dollars ($), Pounds (£), Euros (€), and 160+ others.\n\nLive market rates convert your figures smoothly.\n\nBest of all, your original numbers are locked in safely so switching currencies back and forth will never alter your actual money by even a single penny.', 
      usage: 'Tap the currency button in the top toolbar to pick your currency or open the converter.', 
      significance: 'Easily manage international money or travel without messy math or losing track of your real balances.' 
    }
];

export function getLocalizedTourStep(
  step: TourStep, 
  activeProfileId: string = 'personal', 
  businessName?: string
): TourStep & { isBusinessContext: boolean; scopeName: string; isWrongScope: boolean } {
    const isBusinessContext = activeProfileId !== 'personal';
    const override = isBusinessContext ? step.business : step.personal;
    const scopeName = isBusinessContext ? (businessName || 'Business Entity') : 'Personal Account';
    
    const isWrongScope = Boolean(
      (step.scope === 'business' && !isBusinessContext) ||
      (step.scope === 'personal' && isBusinessContext)
    );

    let resolvedTitle = override?.title || step.title;
    let resolvedContent = override?.content || step.content;
    let resolvedUsage = override?.usage || step.usage;
    let resolvedSignificance = override?.significance || step.significance;

    if (step.scope === 'business' && !isBusinessContext) {
      resolvedContent = `Note: This feature is designed for your Business accounts.\n\n${resolvedContent}\n\nTo manage this, switch to one of your Business profiles using the switcher at the top!`;
    } else if (step.scope === 'personal' && isBusinessContext) {
      resolvedContent = `Note: This feature is designed for your Personal account.\n\n${resolvedContent}\n\nSwitch to your Personal profile in the top bar to view your personal household records.`;
    }

    return {
        ...step,
        title: resolvedTitle,
        content: resolvedContent,
        usage: resolvedUsage,
        significance: resolvedSignificance,
        isBusinessContext,
        scopeName,
        isWrongScope
    };
}

const CATEGORIES = [
  { id: 'all', label: 'All Topics' },
  { id: 'getting_started', label: 'Getting Started' },
  { id: 'cashflow', label: 'Income & Expenses' },
  { id: 'balance_sheet', label: 'Assets & Wealth' },
  { id: 'quadrant', label: 'Business & Freedom' },
  { id: 'operations', label: 'Tools & Settings' },
];

interface ManualModalProps {
    isOpen: boolean;
    activeProfileId?: string;
    businessName?: string;
    onClose: () => void;
    onSkipAll?: () => void;
    onResetTour?: () => void;
}

export const ManualModal: React.FC<ManualModalProps> = ({ 
  isOpen, 
  activeProfileId = 'personal',
  businessName,
  onClose, 
  onResetTour 
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [viewFilter, setViewFilter] = useState<'current' | 'all' | 'personal' | 'business'>('current');

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const isCurrentBusiness = activeProfileId !== 'personal';

    const filteredSteps = useMemo(() => {
        let list = ONBOARDING_CONTENT;
        
        // Scope filtering
        if (viewFilter === 'personal') {
            list = list.filter(s => s.scope !== 'business');
        } else if (viewFilter === 'business') {
            list = list.filter(s => s.scope !== 'personal');
        }

        // Category filtering
        if (activeCategory !== 'all') {
            list = list.filter(s => s.category === activeCategory);
        }

        // Localize based on view filter or active profile
        const effectiveProfile = viewFilter === 'personal' ? 'personal' : (viewFilter === 'business' ? 'business' : activeProfileId);
        let localizedList = list.map(s => getLocalizedTourStep(s, effectiveProfile, businessName));

        // Search filtering
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            localizedList = localizedList.filter(s => 
                s.title.toLowerCase().includes(q) || 
                s.content.toLowerCase().includes(q) ||
                s.usage.toLowerCase().includes(q) ||
                s.significance.toLowerCase().includes(q)
            );
        }
        return localizedList;
    }, [activeCategory, searchQuery, viewFilter, activeProfileId, businessName]);

    const exportManual = () => {
        const content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Financial System - Simple Guide & Handbook</title>
    <style>
        body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 840px; margin: 0 auto; padding: 48px 24px; background: #fafafa; }
        .header { text-align: left; margin-bottom: 48px; padding-bottom: 24px; border-bottom: 1px solid #e2e8f0; }
        .header h1 { font-size: 28px; font-weight: 700; color: #0f172a; margin: 0 0 8px 0; }
        .header p { font-size: 15px; color: #64748b; margin: 0; }
        .step { background: white; border-radius: 16px; padding: 28px; margin-bottom: 24px; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .step-num { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6366f1; margin-bottom: 4px; }
        .step h2 { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0; }
        .content { font-size: 14px; color: #334155; margin-bottom: 16px; line-height: 1.6; white-space: pre-line; }
        .box { padding: 14px 18px; border-radius: 12px; margin-bottom: 12px; font-size: 13px; line-height: 1.5; }
        .usage { background: #f8fafc; border-left: 3px solid #6366f1; color: #475569; }
        .significance { background: #f0fdf4; border-left: 3px solid #10b981; color: #166534; }
        .label { font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; display: block; margin-bottom: 4px; }
        @media print { body { background: white; padding: 0; } .step { box-shadow: none; break-inside: avoid; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>Financial Operating System • User Guide</h1>
        <p>A simple, plain-English reference guide to managing personal finances and building profitable businesses.</p>
    </div>
    ${filteredSteps.map((step, idx) => `
    <div class="step">
        <div class="step-num">Topic ${idx + 1} • ${step.scopeName}</div>
        <h2>${step.title}</h2>
        <div class="content">${step.content.replace(/\n\n/g, '<br><br>')}</div>
        <div class="box usage">
            <span class="label" style="color: #4f46e5;">How to Use It</span>
            ${step.usage}
        </div>
        <div class="box significance">
            <span class="label" style="color: #059669;">Why This Helps You</span>
            ${step.significance}
        </div>
    </div>`).join('')}
</body>
</html>`;
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "Financial_System_User_Guide.html";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;

    return (
        <div 
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-gray-200 dark:border-slate-800">
                
                {/* Header with Generous Spacing & Prominent Back Button */}
                <div className="sticky top-0 z-20 px-4 sm:px-6 py-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                        {/* Prominent Back Button */}
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-100 text-xs sm:text-sm font-bold transition-all group active:scale-95 shadow-2xs"
                                title="Return to Dashboard / Previous View"
                            >
                                <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform text-primary dark:text-indigo-400" />
                                <span>Back to App</span>
                            </button>

                            <div className="h-5 w-px bg-gray-200 dark:bg-slate-700 hidden sm:block"></div>

                            <div className="hidden sm:block">
                                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                                    Simple User Guide
                                </h2>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                    Easy explanations tailored to your Personal and Business accounts
                                </p>
                            </div>
                        </div>

                        {/* Right Tools */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={exportManual}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary dark:text-indigo-400 dark:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
                                title="Download complete handbook as HTML/PDF"
                            >
                                <Download size={13} />
                                <span className="hidden xs:inline">Download Guide</span>
                            </button>

                            {onResetTour && (
                                <button
                                    type="button"
                                    onClick={onResetTour}
                                    className="p-1.5 rounded-xl text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                                    title="Reset in-app guide tips"
                                >
                                    <RotateCcw size={16} />
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={onClose}
                                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                                title="Close Handbook"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Mode Toggle & Search */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        {/* Scope Filter Buttons */}
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                            <button
                                type="button"
                                onClick={() => setViewFilter('current')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    viewFilter === 'current'
                                        ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs'
                                        : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                                }`}
                            >
                                {isCurrentBusiness ? <Briefcase size={12} /> : <User size={12} />}
                                <span>Current ({isCurrentBusiness ? (businessName || 'Business') : 'Personal'})</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewFilter('personal')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    viewFilter === 'personal'
                                        ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs'
                                        : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                                }`}
                            >
                                <User size={12} />
                                <span>Personal Focus</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewFilter('business')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    viewFilter === 'business'
                                        ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs'
                                        : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                                }`}
                            >
                                <Briefcase size={12} />
                                <span>Business Focus</span>
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="relative flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search topics (e.g. buckets, profit, debt, currency, goals)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-gray-900 dark:text-white placeholder-gray-400 transition-all"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Category Filter Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                        {CATEGORIES.map(cat => {
                            const isActive = activeCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                                        isActive
                                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-950 shadow-xs font-bold'
                                            : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {cat.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content Area with Generous Line Spacing & Breathing Space */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-7 md:p-8 space-y-6 sm:space-y-8 bg-gray-50/50 dark:bg-slate-950/40">
                    {filteredSteps.length > 0 ? (
                        filteredSteps.map((step, idx) => (
                            <section 
                                key={step.id} 
                                className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-7 border border-gray-200/80 dark:border-slate-800/90 shadow-2xs hover:shadow-xs transition-shadow space-y-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 flex items-center justify-center font-mono font-bold text-xs sm:text-sm border border-gray-200 dark:border-slate-700 shrink-0 mt-0.5">
                                            {String(idx + 1).padStart(2, '0')}
                                        </span>
                                        <div>
                                            <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight break-words">
                                                {step.title}
                                            </h3>
                                            <span className="text-[11px] font-bold text-primary dark:text-indigo-400">
                                                {step.scopeName}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 shrink-0 hidden sm:inline-block">
                                        {step.category ? step.category.replace('_', ' ') : 'Topic'}
                                    </span>
                                </div>

                                {/* Content with Real Paragraph Breaks & Whitespace */}
                                <div className="text-gray-600 dark:text-gray-300 text-sm sm:text-base leading-relaxed space-y-3 font-normal">
                                    {step.content.split('\n\n').map((paragraph, pIdx) => (
                                        <p key={pIdx}>
                                            {paragraph}
                                        </p>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 pt-2 text-xs sm:text-sm">
                                    {/* Actionable Usage */}
                                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
                                        <div className="flex items-center gap-1.5 font-bold text-primary dark:text-indigo-400 text-xs uppercase tracking-wide">
                                            <Compass size={14} />
                                            <span>How to Use It</span>
                                        </div>
                                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-xs sm:text-[13px]">
                                            {step.usage}
                                        </p>
                                    </div>

                                    {/* Significance: Why This Helps You */}
                                    <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40 space-y-1.5">
                                        <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300 text-xs uppercase tracking-wide">
                                            <Lightbulb size={14} />
                                            <span>Why This Helps You</span>
                                        </div>
                                        <p className="text-emerald-950 dark:text-emerald-200/90 leading-relaxed text-xs sm:text-[13px]">
                                            {step.significance}
                                        </p>
                                    </div>
                                </div>
                            </section>
                        ))
                    ) : (
                        <div className="py-16 text-center space-y-3">
                            <BookOpen size={36} className="mx-auto text-gray-300 dark:text-gray-600" />
                            <h4 className="text-base font-bold text-gray-700 dark:text-gray-300">No topics found</h4>
                            <p className="text-xs text-gray-400">
                                Try typing another word in search or switching tabs.
                            </p>
                            <button
                                type="button"
                                onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-xs font-semibold text-primary dark:text-indigo-400 hover:underline"
                            >
                                Clear search filter
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer with Return Action */}
                <div className="px-4 sm:px-6 py-3 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500">
                    <span>{filteredSteps.length} topics available</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-bold transition-all shadow-xs"
                    >
                        Back to App
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * Floating Context Tip Popup:
 * Designed to be OPPOSITE of the current theme:
 * - When App is in DARK MODE: This popup renders as a crisp, bright, elevated LIGHT card.
 * - When App is in LIGHT MODE: This popup renders as a sleek, deep, contrasty DARK card.
 * This guarantees the user instantly recognizes it as a distinct guide popup and never blends in.
 * Includes generous line breaks, simple English, zero text truncation, and the requested "Why this helps you" section!
 */
export const FloatingContextTip: React.FC<{ 
    tip: TourStep; 
    activeProfileId?: string;
    businessName?: string;
    onDismiss: () => void;
    onSkipAll?: () => void;
}> = ({ tip, activeProfileId = 'personal', businessName, onDismiss, onSkipAll }) => {
    const localized = getLocalizedTourStep(tip, activeProfileId, businessName);

    return (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[10000] w-full max-w-lg px-3 sm:px-4 animate-in fade-in slide-in-from-bottom-5 duration-200 ease-out">
            {/* OPPOSITE THEME CARD:
                Light mode of app -> Dark card: bg-slate-900 text-slate-100 border-slate-700
                Dark mode of app  -> Light card: dark:bg-white dark:text-slate-900 dark:border-gray-200 dark:shadow-2xl
            */}
            <div className="bg-slate-900 text-slate-100 dark:bg-white dark:text-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-700/80 dark:border-gray-200/90 backdrop-blur-xl p-4 sm:p-6 flex flex-col space-y-4">
                
                {/* Header: Scope Badge + Title in Full */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary-300 dark:bg-primary/10 dark:text-primary-600 border border-primary/30 dark:border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Sparkles size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
                                    Quick Guide Tip
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                                    localized.isBusinessContext
                                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30 dark:bg-amber-50 dark:text-amber-700 dark:border-amber-200'
                                        : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 dark:bg-emerald-50 dark:text-emerald-700 dark:border-emerald-200'
                                }`}>
                                    {localized.scopeName}
                                </span>
                            </div>
                            {/* Title rendered in FULL, NO ELLIPSES, wraps naturally */}
                            <h4 className="font-bold text-base sm:text-lg text-white dark:text-gray-900 leading-snug break-words whitespace-normal">
                                {localized.title}
                            </h4>
                        </div>
                    </div>

                    <button 
                        onClick={onDismiss} 
                        aria-label="Close tip"
                        className="text-slate-400 hover:text-white hover:bg-white/10 dark:text-gray-400 dark:hover:text-gray-800 dark:hover:bg-gray-100 p-1.5 rounded-xl transition-colors shrink-0"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content: Clean everyday English with clear paragraph spacing & line breaks */}
                <div className="text-slate-200 dark:text-gray-700 text-xs sm:text-sm leading-relaxed space-y-2.5">
                    {localized.content.split('\n\n').map((paragraph, idx) => (
                        <p key={idx}>
                            {paragraph}
                        </p>
                    ))}
                </div>

                {/* Action Box: How to do it */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-slate-800/90 border border-slate-700/60 text-slate-200 dark:bg-indigo-50/70 dark:border-indigo-100 dark:text-gray-800 text-xs sm:text-sm leading-relaxed space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-primary-300 dark:text-primary-700 text-xs uppercase tracking-wide">
                        <Compass size={14} />
                        <span>How to do it:</span>
                    </div>
                    <p className="text-slate-300 dark:text-gray-700 leading-relaxed">
                        {localized.usage}
                    </p>
                </div>

                {/* Significance: Why this helps you (User requested section) */}
                {localized.significance && (
                    <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-950/40 border border-emerald-700/50 text-emerald-200 dark:bg-emerald-50/80 dark:border-emerald-200 dark:text-emerald-900 text-xs sm:text-sm leading-relaxed space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-400 dark:text-emerald-700 text-xs uppercase tracking-wide">
                            <Lightbulb size={14} />
                            <span>Why this helps you:</span>
                        </div>
                        <p className="leading-relaxed">
                            {localized.significance}
                        </p>
                    </div>
                )}

                {/* Footer Controls: Inverted contrast buttons */}
                <div className="flex items-center justify-between pt-1 gap-2">
                    {onSkipAll ? (
                        <button 
                            type="button"
                            onClick={onSkipAll} 
                            className="text-[11px] sm:text-xs text-slate-400 hover:text-slate-200 dark:text-gray-500 dark:hover:text-gray-900 transition-colors underline-offset-2 hover:underline"
                        >
                            Don&apos;t show guide tips
                        </button>
                    ) : <div />}

                    <button 
                        type="button"
                        onClick={onDismiss} 
                        className="px-5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-white hover:bg-gray-100 text-slate-900 dark:bg-gray-900 dark:hover:bg-black dark:text-white transition-all shadow-md active:scale-95 flex items-center gap-1.5 shrink-0"
                    >
                        <Check size={14} strokeWidth={2.5} />
                        <span>Understood</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
