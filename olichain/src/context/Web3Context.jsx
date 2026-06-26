import { createContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { getOliveTraceContract, getOliPayContract } from "../utils/contracts";

export const Web3Context = createContext(null);

export function Web3Provider({ children }) {
  const [provider, setProvider]   = useState(null);
  const [signer, setSigner]       = useState(null);
  const [account, setAccount]     = useState(null);
  const [chainId, setChainId]     = useState(null);
  const [role, setRole]           = useState(null);   // "producer"|"mill"|"transport"|"distributor"|"admin"|null
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  // Détecte le rôle de l'adresse connectée via le contrat OliveTrace
  const detectRole = useCallback(async (traceContract, address) => {
    try {
      const r = await traceContract.getRole(address);
      console.log("Rôle détecté sur la blockchain :", r);
      // Le contrat renvoie une string : "producer", "mill", etc.
      setRole(r !== "" ? r : null); 
    } catch(error) {
      console.error("Erreur detectRole:", error);
            if (error.code === 'CALL_EXCEPTION') {
              console.error("Le contrat n'existe pas à cette adresse sur ce réseau !");
      }
      
      setRole(null);
      setRole(null);
    }
  }, []);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask non détecté. Installe l'extension MetaMask.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const _provider = new ethers.BrowserProvider(window.ethereum);
      await _provider.send("eth_requestAccounts", []);
      const _signer  = await _provider.getSigner();
      const _account = await _signer.getAddress();
      const network  = await _provider.getNetwork();

      setProvider(_provider);
      setSigner(_signer);
      setAccount(_account);
      setChainId(Number(network.chainId));

      const traceContract = getOliveTraceContract(_signer);
      if (traceContract) {
        await detectRole(traceContract, _account);
      } else {
          console.warn("Contrat introuvable.");
          setRole(null);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [detectRole]);

  const disconnectWallet = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setChainId(null);
    setRole(null);
  }, []);

  // Écoute les changements de compte / réseau MetaMask
  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) disconnectWallet();
      else connectWallet();
    };
    const handleChainChanged = () => window.location.reload();

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged",    handleChainChanged);
    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged",    handleChainChanged);
    };
  }, [connectWallet, disconnectWallet]);

  // Reconnexion automatique si déjà autorisé
  useEffect(() => {
    if (!window.ethereum) return;
    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accounts) => { if (accounts.length > 0) connectWallet(); });
  }, [connectWallet]);

  const value = {
    provider, signer, account, chainId, role,
    loading, error,
    connectWallet, disconnectWallet,
    // Instances des contrats prêtes à l'emploi dans les composants
    oliveTrace: signer ? getOliveTraceContract(signer) : null,
    oliPay:     signer ? getOliPayContract(signer)     : null,
    isCorrectNetwork: chainId === 31337,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}
