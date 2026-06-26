import React, { useState } from 'react';
import { useWeb3 } from "../../hooks/index"; 
import { ethers } from 'ethers';

export default function ReceiveAndPayForm({ lot, onSuccess, onCancel }) {
  const { oliveTrace, oliPay } = useWeb3();
  const [txStatus, setTxStatus] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    retailer: '',
    priceEth: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!oliveTrace || !oliPay || !lot) return;

    try {
      setLoading(true);

      // 0. VÉRIFICATION PRÉVENTIVE : Le lot est-il configuré par l'Admin ?
      const config = await oliPay.getPaymentConfig(lot.id);
      if (!config.configured) {
        setTxStatus("❌ Action bloquée : L'Admin n'a pas encore configuré ce lot. Veuillez le contacter avant de réceptionner.");
        setLoading(false);
        return; // On arrête tout ici, aucune transaction n'est envoyée !
      }

      // 1. ÉTAPE DE RÉCEPTION (Seulement si le lot est encore au statut 2)
      // Si le lot est déjà au statut 3 (votre lot bloqué), on saute cette étape.
      if (Number(lot.status) === 2) {
        setTxStatus("1/2 : Validation de la réception (MetaMask)...");
        const tx1 = await oliveTrace.addDistributionStep(
          lot.id,
          formData.retailer,
          "ipfs://placeholder"
        );
        setTxStatus("1/2 : Attente de la confirmation de réception...");
        await tx1.wait();
      }

      // 2. ÉTAPE DE PAIEMENT
      setTxStatus("2/2 : Validation du paiement (MetaMask)...");
      const amountInWei = ethers.parseEther(formData.priceEth.toString());
      const tx2 = await oliPay.pay(lot.id, { value: amountInWei });
      setTxStatus("2/2 : Distribution des fonds en cours...");
      await tx2.wait();
      
      setTxStatus("✅ Réception et Paiement validés avec succès !");
      
      setTimeout(() => {
        onSuccess();
      }, 3000);

    } catch (error) {
      console.error(error);
      setTxStatus("❌ Erreur lors de la transaction. Vérifiez que vous avez les fonds nécessaires.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', width: '100%', marginTop: '6px', boxSizing: 'border-box', fontFamily: 'inherit' };
  const labelStyle = { fontSize: '0.875rem', fontWeight: '600', color: 'var(--primary-dark)' };

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
      <h3 style={{ marginBottom: '16px' }}>Réception et Paiement du Lot #{Number(lot.id)} ({lot.variety})</h3>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Nom du point de vente</label>
            <input type="text" required placeholder="Ex: Magasin Central Tunis" value={formData.retailer} onChange={(e) => setFormData({...formData, retailer: e.target.value})} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Prix d'achat total (en ETH)</label>
            <input type="number" required step="0.0001" min="0.0001" placeholder="Ex: 10" value={formData.priceEth} onChange={(e) => setFormData({...formData, priceEth: e.target.value})} style={inputStyle} />
          </div>
        </div>

        {txStatus && <p style={{ color: txStatus.includes('❌') ? 'red' : 'var(--primary-dark)', fontWeight: '500' }}>{txStatus}</p>}

        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button type="button" onClick={onCancel} disabled={loading} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'transparent', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '600', color: 'var(--text-muted)' }}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 2, margin: 0, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' ,   display: 'flex',          
    justifyContent: 'center', 
    alignItems: 'center'     }}>
            {loading ? "Traitement en cours..." : (Number(lot.status) === 3 ? "Payer le lot (Déjà réceptionné)" : "Confirmer la réception et Payer")}
          </button>
        </div>
      </form>
    </div>
  );
}