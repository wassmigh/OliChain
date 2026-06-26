import { ethers } from "ethers";

// ── Formatage des données brutes retournées par le contrat ──

export function formatLot(raw) {
  return {
    id:          raw.id?.toString(),
    producer:    raw.producer,
    variety:     raw.variety,
    harvestDate: raw.harvestDate
      ? new Date(Number(raw.harvestDate) * 1000).toLocaleDateString("fr-TN")
      : null,
    quantity:    raw.quantity ? Number(raw.quantity) : null,   // kg
    status:      LOT_STATUS[raw.status] || "inconnu",
    ipfsHash:    raw.ipfsHash,
  };
}

export function formatStep(raw) {
  return {
    stepType:  STEP_LABELS[raw.stepType] || "étape",
    actor:     raw.actor,
    timestamp: raw.timestamp
      ? new Date(Number(raw.timestamp) * 1000).toLocaleString("fr-TN")
      : null,
    data:      raw.data,
    ipfsHash:  raw.ipfsHash,
  };
}

export function formatAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatMatic(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(4) + " MATIC";
}

// Basis points → pourcentage lisible
export function bpsToPercent(bps) {
  return ((Number(bps) / 100)).toFixed(0) + "%";
}

// ── Enums correspondant au contrat Solidity ──

export const LOT_STATUS = {
  0: "Créé",
  1: "Au moulin",
  2: "En transit",
  3: "Distribué",
  4: "Vendu",
};

export const STEP_LABELS = {
  0: "Récolte",
  1: "Pressage",
  2: "Transport",
  3: "Distribution",
  4: "Vente",
};

// ── IPFS ──

const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

export function ipfsUrl(hash) {
  if (!hash) return null;
  const cid = hash.startsWith("ipfs://") ? hash.slice(7) : hash;
  return `${IPFS_GATEWAY}${cid}`;
}

export async function uploadToIPFS(file, metadata = {}) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append(
    "pinataMetadata",
    JSON.stringify({ name: metadata.name || "olichain-doc" })
  );

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.REACT_APP_PINATA_JWT}`,
    },
    body: formData,
  });
  if (!res.ok) throw new Error("Échec upload IPFS");
  const json = await res.json();
  return json.IpfsHash;
}

export async function uploadJsonToIPFS(obj) {
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.REACT_APP_PINATA_JWT}`,
    },
    body: JSON.stringify({ pinataContent: obj }),
  });
  if (!res.ok) throw new Error("Échec upload JSON IPFS");
  const json = await res.json();
  // On retourne bien le format attendu par le smart contract
  return `ipfs://${json.IpfsHash}`; 
}
