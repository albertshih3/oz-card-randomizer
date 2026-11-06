# Oakland Zoo Booster Pack Generator

A web application for generating randomized trading card booster packs for the Oakland Zoo Learning & Engagement trading card program. This tool helps staff create balanced booster packs from various animal collections.

🌐 **Live Application**: [ozboosterpacks.albertshih.org](https://ozboosterpacks.albertshih.org)

## Features

- **Random Booster Pack Generation**: Creates balanced packs with cards from multiple zoo collections
- **Bulk Generation**: Generate up to 1,000 booster packs at once
- **Excel Export**: Export bulk pack contents to Excel spreadsheet for easier (and offline) use.
- **Card Management**: Admin interface for managing card database (add/edit/deactivate cards)
- **Live Catalog**: Cards are read from Firebase each time the generator loads
- **Incomplete Pack Warnings**: If a set runs short, the pack and the spreadsheet both say which slots are empty
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Card Collections

The generator pulls cards from these Oakland Zoo collections:

- African Savannah
- California Trail
- Children's Zoo
- Tropical Rainforest
- Special Edition (including Australia cards)
- Boo at the Zoo
- ARCAS
- New Nature Foundation
- Disney
- Spoonbill (special cards)
- More to come ;)

## Booster Pack Composition

Each booster pack contains:

- 2 cards from each of the first 4 collections (8 cards total)
- 1 random card from any collection (wildcard)
- 1 Spoonbill card
- **Total: 10 cards per pack**

## Technologies Used

- **Frontend**: React + TypeScript + Vite
- **UI Framework**: [HeroUI v2](https://heroui.com)
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **Database**: Firebase Firestore
- **Authentication**: Clerk (for admin features)
- **Excel Export**: xlsx library
- **Animations**: Framer Motion
- **Hosting**: Vercel

## Development Setup

### Prerequisites

- Node.js 26 (see `.nvmrc`)
- npm

### Installation

1. Clone the repository:

```bash
git clone https://github.com/albertshih3/oz-card-randomizer.git
cd oz-card-randomizer
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables. Copy `.env.example` to `.env.local` and fill it in, or run `vercel env pull .env.local`.

4. Run the development server:

```bash
npm run dev
```

`npm run dev` serves the app without the `/api` functions. Use `npm run dev:full` when you need them.

### Checks

```bash
npm run verify       # lint, typecheck, unit tests, production build
npm run test:e2e     # Playwright, with stubbed auth and data
npm run test:rules   # Firestore rules in the emulator (needs Java)
npm run lint:fix     # apply lint fixes
```

### Build for Production

```bash
npm run build
```

### Admin access

Approval is Clerk `publicMetadata.approved`. Invitations grant it automatically. Use `scripts/set-user-approval.mjs` to list, approve, or revoke accounts. See `docs/maintenance-handoff.md` for deployment steps.

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components
│   ├── editcard.tsx    # Card editing interface
│   ├── navbar.tsx      # Navigation component
│   └── theme-switch.tsx # Dark/light mode toggle
├── pages/              # Application pages
│   ├── index.tsx       # Main generator page
│   ├── edit.tsx        # Admin card management
│   ├── about.tsx       # Usage instructions
│   └── changelog.tsx   # Version history
├── config/             # Application configuration
├── hooks/              # Custom React hooks
├── layouts/            # Page layout components
├── lib/                # Utility functions
├── styles/             # Global styles
└── types/              # TypeScript type definitions
```

## Firebase Database Structure

Collections in Firestore:

- `africansavanna` - African Savannah cards
- `californiatrail` - California Trail cards
- `childrenszoo` - Children's Zoo cards
- `tropicalrainforest` - Tropical Rainforest cards
- `specialedition` - Special Edition cards
- `booatthezoo` - Boo at the Zoo cards
- `arcas` - ARCAS cards
- `newnaturefoundation` - New Nature Foundation cards
- `disney` - Disney cards
- `spoonbill` - Special Spoonbill cards

Each card document contains:

```javascript
{
  name: "Card Name",
  number: "Card Number",
  active: true/false  // Whether card appears in generator
}
```

## Usage

### For Staff (Basic Use)

1. Visit [ozboosterpacks.albertshih.org](https://ozboosterpacks.albertshih.org)
2. Click "Generate Booster Pack" for a single pack
3. Use the table to track which cards to pull from inventory
4. For multiple packs, click "Create a Spreadsheet" and specify quantity

### For Admins (Card Management)

1. Click "Edit Cards" in the navigation
2. Sign in with approved account
3. Add, edit, or deactivate cards as needed
4. Contact ashih@oaklandzoo.org for access

## Contact

- **App Support**: Albert Shih - [ashih@oaklandzoo.org](mailto:ashih@oaklandzoo.org)
- **Program Information**: Patrick Wolff - [pwolff@oaklandzoo.org](mailto:pwolff@oaklandzoo.org)

## License

This project is for internal use by Oakland Zoo Learning & Engagement staff only.
