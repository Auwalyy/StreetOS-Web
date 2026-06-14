# StreetOS AI — Mobile App

React Native / Expo mobile app for StreetOS AI.

## Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your phone (iOS or Android)

## Setup

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone.

## Backend

Connected to: `https://streetos-web.onrender.com/api`

## Screens

### Auth
- Login
- Register
- New Business Setup

### Main Tabs
- **Dashboard** — Revenue, expenses, profit, health score, AI advisor, quick actions
- **Transactions** — List, filter, add sales & expenses
- **Inventory** — Products, stock tracking, low stock alerts
- **Debts** — Debt book, payment recording, reminders
- **Analytics** — Charts, health score, top products
- **AI Advisor** — Business advice, voice entry, loan readiness, business passport
- **More** — Employees, Suppliers, Savings, Adashe, Community, Market Intel, Notifications, Profile

## Build for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build Android APK
eas build -p android --profile preview

# Build iOS
eas build -p ios --profile preview
```

## Tech Stack

- Expo 51 (React Native)
- React Navigation (Stack + Bottom Tabs)
- TanStack Query v5
- Zustand + AsyncStorage
- Axios
- date-fns
- expo-linear-gradient
