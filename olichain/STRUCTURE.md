# OliChain — Structure des composants React

## Arborescence complète

```
src/
│
├── App.jsx                          # Routeur principal + PrivateRoute
│
├── context/
│   └── Web3Context.jsx              # État global : provider, signer, account, role
│
├── hooks/
│   └── index.js                     # useWeb3 · useLot · useTransaction · useMyLots
│
├── utils/
│   ├── contracts.js                 # ABI, adresses, factories, switchNetwork
│   └── formatters.js                # formatLot, formatAddress, ipfsUrl, upload IPFS
│
├── components/
│   ├── layout/
│   │   └── Layout.jsx               # Layout + Navbar (liens selon rôle)
│   │
│   ├── common/
│   │   └── index.jsx                # WalletButton · TxStatus · LotCard
│   │                                # StepTimeline · NetworkGuard
│   ├── producer/
│   │   └── CreateLotForm.jsx        # Formulaire création lot + upload IPFS
│   │
│   ├── mill/
│   │   └── MillStepForm.jsx         # (à extraire de pages/other-pages.jsx)
│   │
│   ├── transport/
│   │   └── TransportStepForm.jsx    # (à extraire)
│   │
│   └── distributor/
│       └── PaymentPanel.jsx         # Simulation + déclenchement paiement automatisé
│
└── pages/
    ├── index.jsx                    # HomePage · DashboardPage · ProducerPage · TrackPage
    ├── other-pages.jsx              # MillPage · TransportPage · DistributorPage · AdminPage
    ├── MillPage.jsx
    ├── TransportPage.jsx
    ├── DistributorPage.jsx
    └── AdminPage.jsx
```

---

## Flux de données

```
MetaMask
  └─► Web3Context  (provider, signer, account, role)
        └─► useWeb3()  ──────────────────────────────────────────┐
              ├─► oliveTrace  (instance OliveTrace.sol)          │
              └─► oliPay      (instance OliPay.sol)              │
                                                                  │
useLot(lotId)          ──────► oliveTrace.getLot()               │
useMyLots()            ──────► oliveTrace.getLotsByActor()       │
useTransaction().send  ──────► tx.wait() → confirmation         ◄┘
```

---

## Variables d'environnement (.env)

```env
VITE_CHAIN_ID=80002
VITE_OLIVE_TRACE_ADDRESS=0x...
VITE_OLI_PAY_ADDRESS=0x...
VITE_EXPLORER_URL=https://amoy.polygonscan.com
```

---

## Installation

```bash
npm create vite@latest olichain -- --template react
cd olichain
npm install ethers react-router-dom
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

## Packages nécessaires

| Package            | Usage                                    |
|--------------------|------------------------------------------|
| `ethers`           | Interaction avec les smart contracts     |
| `react-router-dom` | Navigation + routes protégées par rôle   |
| `tailwindcss`      | Styles utilitaires                       |
| `qrcode.react`     | Génération QR code pour TrackPage        |
| `react-hot-toast`  | Notifications de transaction (optionnel) |

---

## Points d'attention

### Sécurité
- Ne jamais exposer de clé privée côté frontend
- Vérifier `isCorrectNetwork` avant tout appel contrat
- Vérifier le rôle on-chain, pas juste en localStorage

### Gestion des erreurs MetaMask
- `err.code === "ACTION_REJECTED"` → utilisateur a refusé dans MetaMask
- `err.code === "INSUFFICIENT_FUNDS"` → pas assez de MATIC pour le gas
- Ces cas sont gérés dans `useTransaction.send()`

### Événements temps réel
- `useLot` écoute `StepAdded` via `oliveTrace.on(filter, handler)`
- Le dashboard se met à jour automatiquement quand une étape est ajoutée
