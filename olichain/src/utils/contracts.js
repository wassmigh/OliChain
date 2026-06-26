import { ethers } from "ethers";

// ── ABI minimalistes (à remplacer par les ABI complets après compilation Hardhat) ──

export const OLIVE_TRACE_ABI = [
  // Lecture
  "function getLot(uint256 lotId) view returns (tuple(uint256 id, address producer, string variety, uint256 harvestDate, uint256 quantity, uint8 status, string ipfsHash))",
  "function getLotSteps(uint256 lotId) view returns (tuple(uint8 stepType, address actor, uint256 timestamp, string data, string ipfsHash)[])",
  "function getLotsByActor(address actor) view returns (uint256[])",
  "function getRole(address account) view returns (string)",
  "function totalLots() view returns (uint256)",

  // Écriture — Producteur
  "function createLot(string variety, uint256 quantity, string location, string ipfsHash) returns (uint256)",

  // Écriture — Moulin
  "function addMillStep(uint256 lotId, uint256 outputLiters, uint256 acidity, string label, string ipfsHash)",

  // Écriture — Transporteur
  "function addTransportStep(uint256 lotId, string destination, uint256 temperature, string ipfsHash)",

  // Écriture — Distributeur
  "function addDistributionStep(uint256 lotId, string retailer, string ipfsHash)",

  // Événements
  "event LotCreated(uint256 indexed lotId, address indexed producer, string variety)",
  "event StepAdded(uint256 indexed lotId, uint8 indexed stepType, address indexed actor)",
];

export const OLI_PAY_ABI = [
  // Lecture
  "function getPaymentConfig(uint256 lotId) view returns (tuple(address producer, uint16 producerBps, address mill, uint16 millBps, address transport, uint16 transportBps, bool configured))",
  "function getPaymentHistory(uint256 lotId) view returns (tuple(uint256 amount, uint256 timestamp, address distributor)[])",
  "function isLotPaid(uint256 lotId) view returns (bool)",

  // Écriture
  "function configureLot(uint256 lotId, address producer, uint16 producerBps, address mill, uint16 millBps, address transport, uint16 transportBps)",
  "function pay(uint256 lotId) payable",

  // Événements
  "event LotConfigured(uint256 indexed lotId, address producer, address mill, address transport)",
  "event PaymentDistributed(uint256 indexed lotId, uint256 amountDistributed, address indexed distributor, uint256 timestamp)",
  "event ShareSent(uint256 indexed lotId, address indexed recipient, uint256 amount, string role)",
];

// ── Adresses des contrats déployés (à renseigner dans .env) ──
export const CONTRACT_ADDRESSES = {
  // On essaie process.env (Create React App) OU import.meta.env (Vite) pour être sûr
  oliveTrace: process.env.REACT_APP_OLIVE_TRACE_ADDRESS || (import.meta && import.meta.env ? import.meta.env.VITE_OLIVE_TRACE_ADDRESS : null),
  oliPay:     process.env.REACT_APP_OLI_PAY_ADDRESS || (import.meta && import.meta.env ? import.meta.env.VITE_OLI_PAY_ADDRESS : null),
};

// ── Factories ──
export function getOliveTraceContract(signerOrProvider) {
  if (!CONTRACT_ADDRESSES.oliveTrace) return null; // <-- Sécurité pour éviter les erreurs si l'adresse n'est pas définie
  return new ethers.Contract(
    CONTRACT_ADDRESSES.oliveTrace,
    OLIVE_TRACE_ABI,
    signerOrProvider
  );
}

export function getOliPayContract(signerOrProvider) {
   if (!CONTRACT_ADDRESSES.oliPay) return null;
  return new ethers.Contract(
    CONTRACT_ADDRESSES.oliPay,
    OLI_PAY_ABI,
    signerOrProvider
  );
}

// ── Réseau cible (local) ──
export const TARGET_NETWORK = {
  chainId:   "0x7A69",   // 31337 Hardhat local
  chainName: "Hardhat Local",
  rpcUrls:   ["http://127.0.0.1:8545"],
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  blockExplorerUrls: [],
};

// Demande à MetaMask de switcher vers le bon réseau
export async function switchToTargetNetwork() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: TARGET_NETWORK.chainId }],
    });
  } catch (err) {
    if (err.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [TARGET_NETWORK],
      });
    }
  }
}
