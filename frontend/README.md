# Ascent OTM — React Frontend

## Tech Stack
- **React 18** + Vite
- **React Router v6** — all routes
- **Axios** — API calls with JWT auto-attach
- **Custom CSS Design System** — no Bootstrap dependency
- **Font Awesome 6** — icons via CDN
- **Sora + DM Sans** — typography

## Project Structure

```
src/
├── api/
│   └── axios.js              # Axios instance — auto JWT + 401 redirect
├── context/
│   └── AuthContext.jsx       # Auth state (replaces PHP $_SESSION)
├── hooks/
│   └── useForm.js            # Reusable form hook for all Create/Edit pages
├── components/
│   ├── layout/
│   │   ├── Layout.jsx        # Replaces inc/header.php wrapper
│   │   ├── Sidebar.jsx       # Replaces side_bar.php (dynamic, API-driven)
│   │   └── Navbar.jsx        # Replaces nav_bar.php
│   └── common/
│       ├── DataTable.jsx     # Replaces jQuery DataTables (server-side)
│       ├── PageHeader.jsx    # Replaces breadcrumb block in every PHP page
│       └── FormCard.jsx      # Replaces card+form wrapper in every create.php
├── pages/
│   ├── login/Login.jsx
│   ├── dashboard/Dashboard.jsx
│   ├── city_creation/        List.jsx + Create.jsx
│   ├── customer_creation/    List.jsx + Create.jsx
│   ├── po_creation/          List.jsx + Create.jsx
│   ├── invoice_creation/     List.jsx + Create.jsx
│   └── bill_creation/        List.jsx + Create.jsx
├── index.css                 # Full design system (tokens, layout, components)
├── main.jsx
└── App.jsx                   # All routes (replaces index.php + body.php)
```

## PHP → React Migration Map

| PHP File             | React Equivalent                          |
|----------------------|-------------------------------------------|
| `index.php`          | `App.jsx` — auth check + routing          |
| `body.php`           | `App.jsx` route tree                      |
| `inc/header.php`     | `Layout.jsx`                              |
| `side_bar.php`       | `Sidebar.jsx` (fetches from `/api/menus`) |
| `nav_bar.php`        | `Navbar.jsx`                              |
| `folders/*/list.php` | `pages/*/List.jsx`                        |
| `folders/*/create.php`| `pages/*/Create.jsx`                     |
| `folders/*/crud.php` | FastAPI backend endpoints                 |
| `$_SESSION`          | `AuthContext` + JWT in localStorage       |
| jQuery DataTables    | `DataTable.jsx` (server-side)             |
| `btn_cancel()`       | `FormCard.jsx` Cancel button              |
| `select_option()`    | `<select>` with mapped options            |

## Setup & Run

```bash
# Install dependencies
npm install

# Start dev server (proxies /api to FastAPI on :8000)
npm run dev

# Build for production
npm run build
```

## Adding a New Module

To add any new module (e.g. `employee_creation`):

1. Create `src/pages/employee_creation/List.jsx` — copy from any existing List.jsx, change `apiUrl` and `columns`
2. Create `src/pages/employee_creation/Create.jsx` — copy from any existing Create.jsx, update fields
3. Add routes in `App.jsx`:
   ```jsx
   <Route path="/employee-creation/list"   element={<Protected><EmployeeCreationList /></Protected>} />
   <Route path="/employee-creation/create" element={<Protected><EmployeeCreationCreate /></Protected>} />
   ```
4. Add to `FALLBACK_MENUS` in `Sidebar.jsx` (or return from your `/api/menus` endpoint)

## Environment Variables

Create a `.env` file for production:
```
VITE_API_URL=https://your-api-domain.com/api
```

Then update `src/api/axios.js`:
```js
baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api"
```
