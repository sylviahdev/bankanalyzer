# BankAnalyzer — frontend

React SPA for the BankAnalyzer Flask API.

React 19 · Vite · TypeScript · Tailwind CSS 4 · React Router · Axios · Recharts · Lucide.

```bash
npm install
cp .env.example .env.local     # set VITE_API_URL
npm run dev                    # http://localhost:5173
```

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server with HMR |
| `npm run build` | `tsc -b` then a production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | oxlint |

Setup, environment variables, deployment, and how the app authenticates against
Flask are documented in the [repository README](../README.md#frontend).

## Layout

```
src/
├── components/
│   ├── ui/            # Button, Input, Select, Card, Badge, Alert, Pagination, states
│   ├── layout/        # AppLayout, Sidebar, AuthLayout, PageHeader, Logo
│   ├── charts/        # Recharts wrappers + shared chart chrome
│   ├── dashboard/     # StatCard
│   ├── transactions/  # TransactionTable, filters
│   └── upload/        # Dropzone
├── pages/             # One component per route
├── services/          # Axios instance + one module per API area
├── context/           # AuthProvider
├── hooks/             # useAuth, useAsync, useDebouncedValue, useCategoryColors
├── types/api.ts       # Types mirroring the Flask responses
└── utils/             # Formatting, validation, chart palette
```

Two conventions worth knowing before editing:

- **No component calls the API directly.** Everything goes through `services/`, which
  owns the URLs, the auth header and error normalisation.
- **Chart colours come from `utils/palette.ts` only.** The slot order is a validated
  colourblind-safe sequence — assign in order, never cycle past the last slot (fold
  the tail into "Other" with `foldCategories`), and key colours off the category name
  so filtering never repaints a series.
