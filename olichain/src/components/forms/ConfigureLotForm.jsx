import React, { useState } from 'react';
import { useWeb3 } from "../../hooks/index";

export default function ConfigureLotForm({ lot, onSuccess, onCancel }) {
  const { oliPay } = useWeb3();
  const [txStatus, setTxStatus] = useState('');
  const [loading, setLoading] = useState(false);
  
  // NOUVEAU : Plus de distributeur ici !
  const [formData, setFormData] = useState({
    producer: lot.producer, 
    producerPct: '55',    // 55%
    mill: '',
    millPct: '22',        // 22%
    transport: '',
    transportPct: '23',   // 23%
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!oliPay || !lot) return;

    try {
      setLoading(true);
      setTxStatus("Validation MetaMask en cours...");

      // 1. Vérification locale : le total des 3 acteurs doit faire 100%
      const totalPct = Number(formData.producerPct) + Number(formData.millPct) + Number(formData.transportPct);
      if (totalPct !== 100) {
        throw new Error(`Le total des parts doit être exactement 100%. Actuel: ${totalPct}%`);
      }

      // 2. Conversion en Basis Points (bps)
      const producerBps = Math.round(Number(formData.producerPct) * 100);
      const millBps = Math.round(Number(formData.millPct) * 100);
      const transportBps = Math.round(Number(formData.transportPct) * 100);

      // 3. Envoi à la blockchain (avec les 7 arguments attendus par le NOUVEAU contrat)
      const tx = await oliPay.configureLot(
        lot.id,
        formData.producer, producerBps,
        formData.mill, millBps,
        formData.transport, transportBps
      );

      setTxStatus("Transaction envoyée, attente de confirmation...");
      await tx.wait();
      
      setTxStatus("✅ Lot configuré avec succès ! Le distributeur peut maintenant payer.");
      
      setTimeout(() => {
        onSuccess();
      }, 3000);

    } catch (error) {
      console.error(error);
      setTxStatus(`❌ Erreur : ${error.message || "Échec de la configuration."}`);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', width: '100%', boxSizing: 'border-box' };
  const labelStyle = { fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' };

  const currentTotal = Number(formData.producerPct) + Number(formData.millPct) + Number(formData.transportPct);

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
      <h3 style={{ marginBottom: '16px' }}>Configuration des paiements - Lot #{Number(lot.id)}</h3>
      
      <div style={{ backgroundColor: currentTotal === 100 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${currentTotal === 100 ? '#bbf7d0' : '#fecaca'}`, padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem', color: currentTotal === 100 ? '#166534' : '#991b1b' }}>
        <strong>Total réparti : {currentTotal}%</strong> (doit être exactement 100% de la somme envoyée par le distributeur)
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Producteur */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 2 }}>
            <label style={labelStyle}>Adresse Producteur</label>
            <input type="text" required value={formData.producer} onChange={(e) => setFormData({...formData, producer: e.target.value})} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Part (%)</label>
            <input type="number" step="0.1" required value={formData.producerPct} onChange={(e) => setFormData({...formData, producerPct: e.target.value})} style={inputStyle} />
          </div>
        </div>

        {/* Moulin */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 2 }}>
            <label style={labelStyle}>Adresse Moulin</label>
            <input type="text" required placeholder="0x..." value={formData.mill} onChange={(e) => setFormData({...formData, mill: e.target.value})} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Part (%)</label>
            <input type="number" step="0.1" required value={formData.millPct} onChange={(e) => setFormData({...formData, millPct: e.target.value})} style={inputStyle} />
          </div>
        </div>

        {/* Transport */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 2 }}>
            <label style={labelStyle}>Adresse Transporteur</label>
            <input type="text" required placeholder="0x..." value={formData.transport} onChange={(e) => setFormData({...formData, transport: e.target.value})} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Part (%)</label>
            <input type="number" step="0.1" required value={formData.transportPct} onChange={(e) => setFormData({...formData, transportPct: e.target.value})} style={inputStyle} />
          </div>
        </div>

        {txStatus && <p style={{ color: txStatus.includes('❌') ? 'red' : 'var(--primary-dark)', fontSize: '0.9rem' }}>{txStatus}</p>}

        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button type="button" onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: '600' }}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={loading || currentTotal !== 100} style={{ flex: 2, margin: 0, opacity: (loading || currentTotal !== 100) ? 0.5 : 1,
    display: 'flex',          
    justifyContent: 'center', 
    alignItems: 'center'       }}>{loading ? "Configuration..." : "Valider la configuration"}</button>
        </div>
      </form>
    </div>
  );
}