import React, { useState } from 'react';
import { useWeb3 } from "../../hooks/index";

// Composant du formulaire pour le Transporteur
export default function TransportLotForm({ lot, onSuccess, onCancel }) {
  const { oliveTrace } = useWeb3();
  const [txStatus, setTxStatus] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    destination: '',
    temperature: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!oliveTrace || !lot) return;

    try {
      setLoading(true);
      setTxStatus("Validation MetaMask en cours...");

      const tx = await oliveTrace.addTransportStep(
        lot.id,
        formData.destination,
        Number(formData.temperature),
        "ipfs://placeholder" // Bon de transport IPFS
      );

      setTxStatus("Transaction envoyée, attente de confirmation...");
      await tx.wait();
      
      setTxStatus("✅ Transport démarré avec succès !");
      
      setTimeout(() => {
        onSuccess();
      }, 2000);

    } catch (error) {
      console.error(error);
      setTxStatus("❌ Erreur lors de la validation du transport.");
    } finally {
      setLoading(false);
    }
  };

  // Styles partagés
  const inputStyle = {
    padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)',
    width: '100%', marginTop: '6px', boxSizing: 'border-box', fontFamily: 'inherit'
  };
  const labelStyle = { fontSize: '0.875rem', fontWeight: '600', color: 'var(--primary-dark)' };

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
      <h3 style={{ marginBottom: '16px' }}>Transport du Lot #{Number(lot.id)} ({lot.variety})</h3>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Destination</label>
            <input 
              type="text" required placeholder="Ex: Entrepôt Central, Tunis"
              value={formData.destination} onChange={(e) => setFormData({...formData, destination: e.target.value})}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Température du camion (°C)</label>
            <input 
              type="number" required placeholder="Ex: 18"
              value={formData.temperature} onChange={(e) => setFormData({...formData, temperature: e.target.value})}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Pièce jointe (Bon de transport) */}
        <div>
          <label style={labelStyle}>Bon de transport (facultatif)</label>
          <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input type="file" id="transport-upload" accept=".pdf,.jpg,.png" style={{ display: 'none' }} />
            <label htmlFor="transport-upload" className="btn-outline" style={{ cursor: 'pointer', padding: '8px 16px', fontSize: '0.875rem', margin: 0, display: 'inline-block' }}>
              Choisir un fichier
            </label>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aucun fichier sélectionné</span>
          </div>
        </div>

        {txStatus && <p style={{ color: txStatus.includes('❌') ? 'red' : 'var(--primary-dark)' }}>{txStatus}</p>}

        {/* Boutons d'action */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button 
            type="button" 
            onClick={onCancel}
            style={{ 
              flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', 
              backgroundColor: 'transparent', cursor: 'pointer', fontWeight: '600', color: 'var(--text-muted)' 
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            Annuler
          </button>
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
            style={{ flex: 2, margin: 0, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' ,
                display: 'flex',          
                justifyContent: 'center', 
                alignItems: 'center'}}
          >
            {loading ? "En attente..." : "Démarrer le transport"}
          </button>
        </div>
      </form>
    </div>
  );
}