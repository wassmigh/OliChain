import { useWeb3 } from "../../hooks/index";
import { formatAddress } from "../../utils/formatters";
import { Link } from "react-router-dom";
import { LOT_STATUS } from "../../utils/formatters";
import { switchToTargetNetwork, TARGET_NETWORK } from "../../utils/contracts";

// ─────────────────────────────────────────────
// components/common/WalletButton.jsx
// Bouton de connexion MetaMask avec état visuel
// ─────────────────────────────────────────────

export function WalletButton() {
  const { account, role, loading, error, connectWallet, disconnectWallet, isCorrectNetwork } = useWeb3();

  if (loading) return (
    <button disabled className="btn btn-outline opacity-50 text-sm">
      Connexion…
    </button>
  );

  if (!account) return (
    <button onClick={connectWallet} className="btn btn-primary text-sm">
      Connecter MetaMask
    </button>
  );

  if (!isCorrectNetwork) return (
    <button onClick={switchToTargetNetwork} className="btn btn-warning text-sm">
      Changer de réseau
    </button>
  );

  return (
    <div className="flex items-center gap-3">
      {role && (
        <span className="text-xs bg-olive-100 text-olive-800 px-2 py-1 rounded-full font-medium capitalize">
          {role}
        </span>
      )}
      <button
        onClick={disconnectWallet}
        title="Déconnecter"
        className="text-xs text-stone-500 hover:text-stone-800 border border-stone-200 rounded-lg px-3 py-1.5 font-mono"
      >
        {formatAddress(account)}
      </button>
    </div>
  );
}
export default WalletButton;


// ─────────────────────────────────────────────
// components/common/TxStatus.jsx
// Affiche l'état d'une transaction blockchain
// ─────────────────────────────────────────────
export function TxStatus({ txHash, pending, success, txError, onClose }) {
  if (!pending && !success && !txError) return null;

  const explorerUrl = `${import.meta.env.VITE_EXPLORER_URL}/tx/${txHash}`;

  return (
    <div className={`rounded-xl p-4 mt-4 text-sm flex items-start justify-between gap-3
      ${pending ? "bg-amber-50 border border-amber-200" : ""}
      ${success ? "bg-green-50 border border-green-200" : ""}
      ${txError ? "bg-red-50 border border-red-200" : ""}
    `}>
      <div>
        {pending && (
          <p className="text-amber-800 font-medium">
            ⏳ Transaction en cours… Confirme dans MetaMask.
          </p>
        )}
        {success && (
          <>
            <p className="text-green-800 font-medium">✅ Transaction confirmée !</p>
            {txHash && (
              <a href={explorerUrl} target="_blank" rel="noreferrer"
                className="text-green-700 underline text-xs mt-1 block">
                Voir sur PolygonScan →
              </a>
            )}
          </>
        )}
        {txError && (
          <p className="text-red-800">
            ❌ Erreur : {txError}
          </p>
        )}
      </div>
      {onClose && !pending && (
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg leading-none">×</button>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────
// components/common/LotCard.jsx
// Carte résumé d'un lot (liste de lots)
// ─────────────────────────────────────────────


const STATUS_COLORS = {
  "Créé":       "bg-stone-100 text-stone-700",
  "Au moulin":  "bg-amber-100 text-amber-800",
  "En transit": "bg-blue-100 text-blue-800",
  "Distribué":  "bg-purple-100 text-purple-800",
  "Vendu":      "bg-green-100 text-green-800",
};

export function LotCard({ lot }) {
  return (
    <Link
      to={`/track/${lot.id}`}
      className="block bg-white border border-stone-200 rounded-xl p-4 hover:border-olive-400 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-stone-800">Lot #{lot.id}</p>
          <p className="text-sm text-stone-500">{lot.variety} — {lot.quantity} kg</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[lot.status] || ""}`}>
          {lot.status}
        </span>
      </div>
      <p className="text-xs text-stone-400">Récolte : {lot.harvestDate}</p>
    </Link>
  );
}


// ─────────────────────────────────────────────
// components/common/StepTimeline.jsx
// Frise chronologique des étapes d'un lot
// ─────────────────────────────────────────────


const STEP_ICONS = { "Récolte": "🌿", "Pressage": "⚙️", "Transport": "🚛", "Distribution": "📦", "Vente": "💳" };

export function StepTimeline({ steps }) {
  if (!steps?.length) return (
    <p className="text-stone-400 text-sm text-center py-8">Aucune étape enregistrée.</p>
  );

  return (
    <ol className="relative border-l border-olive-200 ml-4 space-y-6">
      {steps.map((step, i) => (
        <li key={i} className="ml-6">
          <span className="absolute -left-3 flex items-center justify-center w-6 h-6 bg-olive-100 rounded-full text-sm">
            {STEP_ICONS[step.stepType] || "•"}
          </span>
          <div className="bg-white border border-stone-100 rounded-xl p-3">
            <p className="font-medium text-stone-800 text-sm">{step.stepType}</p>
            <p className="text-xs text-stone-500 mt-0.5">{step.timestamp}</p>
            {step.data && <p className="text-xs text-stone-600 mt-1">{step.data}</p>}
            <p className="text-xs text-stone-400 font-mono mt-1">{formatAddress(step.actor)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}


// ─────────────────────────────────────────────
// components/common/NetworkGuard.jsx
// Affiche un message si le mauvais réseau est sélectionné
// ─────────────────────────────────────────────


export function NetworkGuard({ children }) {
  const { account, isCorrectNetwork } = useWeb3();
  if (!account || isCorrectNetwork) return children;
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
      <p className="text-lg font-semibold text-stone-700">Mauvais réseau détecté</p>
      <p className="text-stone-500 text-sm">OliChain tourne sur {TARGET_NETWORK.chainName}.</p>
      <button onClick={switchToTargetNetwork} className="btn btn-primary">
        Passer sur {TARGET_NETWORK.chainName}
      </button>
    </div>
  );
}
