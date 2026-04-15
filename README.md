# JDM Contracting CRM

## Quick Start (Run Locally)

You need [Node.js](https://nodejs.org) installed (v18 or newer).

### First time setup
```bash
cd jdm-crm
npm install
npm run build
```

### Run the app
```bash
NODE_ENV=production node dist/index.cjs
```

Then open your browser to: **http://localhost:5000**

Your data is saved in a file called `crm.db` in the same folder — back it up to keep your contacts safe.

### To run in dev mode (with live reload)
```bash
npm run dev
```
