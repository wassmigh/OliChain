import { useState, useEffect, useCallback } from "react";
import { formatLot } from "../utils/formatters";
import { useContext } from "react";
import { Web3Context } from "../context/Web3Context";


// hooks/useWeb3.js
// Accès simplifié au Web3Context depuis n'importe quel composant


export function useWeb3() {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error("useWeb3 doit être utilisé dans Web3Provider");
  return ctx;
}


// hooks/useLot.js
// Charge et écoute les données d'un lot on-chain


export function useLot(lotId) {
  const { oliveTrace, provider } = useWeb3();
  const [lot, setLot]         = useState(null);
  const [steps, setSteps]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const fetchLot = useCallback(async () => {
    if (!oliveTrace || !lotId) return;
    setLoading(true);
    setError(null);
    try {
      const rawLot   = await oliveTrace.getLot(lotId);
      const rawSteps = await oliveTrace.getLotSteps(lotId);
      setLot(formatLot(rawLot));
      setSteps(rawSteps.map(formatLot));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [oliveTrace, lotId]);

  useEffect(() => { fetchLot(); }, [fetchLot]);

  // Écoute l'événement StepAdded en temps réel
  useEffect(() => {
    if (!oliveTrace || !lotId) return;
    const filter = oliveTrace.filters.StepAdded(lotId);
    const handler = () => fetchLot();
    oliveTrace.on(filter, handler);
    return () => oliveTrace.off(filter, handler);
  }, [oliveTrace, lotId, fetchLot]);

  return { lot, steps, loading, error, refetch: fetchLot };
}


// hooks/useTransaction.js
// Gère l'état d'une transaction blockchain (pending / confirmed / error)


export function useTransaction() {
  const [txHash, setTxHash]   = useState(null);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [txError, setTxError] = useState(null);

  const send = useCallback(async (contractCall) => {
    setPending(true);
    setSuccess(false);
    setTxError(null);
    setTxHash(null);
    try {
      const tx = await contractCall();
      setTxHash(tx.hash);
      await tx.wait();       // attend la confirmation
      setSuccess(true);
      return tx;
    } catch (err) {
      // MetaMask rejette => err.code === "ACTION_REJECTED"
      setTxError(err.reason || err.message);
      throw err;
    } finally {
      setPending(false);
    }
  }, []);

  const reset = useCallback(() => {
    setTxHash(null);
    setPending(false);
    setSuccess(false);
    setTxError(null);
  }, []);

  return { txHash, pending, success, txError, send, reset };
}


// hooks/useMyLots.js
// Retourne tous les lots associés à l'adresse connectée


export function useMyLots() {
  const { oliveTrace, account } = useWeb3();
  const [lots, setLots]         = useState([]);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (!oliveTrace || !account) return;
    setLoading(true);
    oliveTrace
      .getLotsByActor(account)
      .then((raw) => setLots(raw.map(formatLot)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [oliveTrace, account]);

  return { lots, loading };
}
