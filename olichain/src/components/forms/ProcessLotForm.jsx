import React, { useState } from 'react';
import { useWeb3 } from "../../hooks/index";
import { uploadToIPFS } from '../../utils/formatters';

export default function ProcessLotForm({ lot, onSuccess, onCancel }) {
  const { oliveTrace } = useWeb3();
  const [txStatus, setTxStatus] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    outputLiters: '',
    acidity: '',
    label: 'Extra Vierge',
    certificateFile: null // 🌟 NOUVEAU : Pour stocker le fichier
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!oliveTrace || !lot) return;

    try {
      setLoading(true);
      let ipfsHash = "ipfs://placeholder";

      // 🌟 NOUVEAU : 1. UPLOAD SUR IPFS (Si un fichier a été sélectionné)
      if (formData.certificateFile) {
        setTxStatus("1/2 : Envoi du certificat sur IPFS (Pinata)...");
        const cid = await uploadToIPFS(formData.certificateFile, { name: `Certificat_Lot_${lot.id}` });
        ipfsHash = `ipfs://${cid}`;
        console.log("Certificat uploadé avec succès :", ipfsHash);
        setTxStatus("2/2 : Validation MetaMask en cours...");
      } else {
        setTxStatus("Validation MetaMask en cours...");
      }
      
      // Le contrat attend l'acidité en centièmes (ex: 0.3% devient 30)
      const acidityInCentiemes = Math.round(parseFloat(formData.acidity) * 100);

      // 2. ENREGISTREMENT SUR LA BLOCKCHAIN
      const tx = await oliveTrace.addMillStep(
        lot.id,
        formData.outputLiters,
        acidityInCentiemes,
        formData.label,
        ipfsHash // 🌟 NOUVEAU : On envoie le vrai lien IPFS
      );

      setTxStatus("Transaction envoyée, attente de confirmation...");
      await tx.wait();
      
      setTxStatus("✅ Extraction validée avec succès !");
      
      // On attend 2 secondes pour laisser l'utilisateur lire le message de succès, puis on ferme
      setTimeout(() => {
        onSuccess();
      }, 2000);

    } catch (error) {
      console.error(error);
      setTxStatus("❌ Erreur lors de la validation.");
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
      <h3 style={{ marginBottom: '16px' }}>Traitement du Lot #{Number(lot.id)} ({lot.variety})</h3>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Huile extraite (Litres)</label>
            <input 
              type="number" required min="1" placeholder="Ex: 380"
              value={formData.outputLiters} onChange={(e) => setFormData({...formData, outputLiters: e.target.value})}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Acidité (%)</label>
            <input 
              type="number" required step="0.01" min="0" max="100" placeholder="Ex: 0.3"
              value={formData.acidity} onChange={(e) => setFormData({...formData, acidity: e.target.value})}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Label Qualité</label>
            <select 
              value={formData.label} onChange={(e) => setFormData({...formData, label: e.target.value})}
              style={inputStyle}
            >
              <option value="Extra Vierge">Extra Vierge</option>
              <option value="Vierge">Vierge</option>
              <option value="Courante">Courante</option>
            </select>
          </div>
        </div>

        {/* Pièce jointe (Certificat) */}
        <div>
          <label style={labelStyle}>Certificat d'analyse (facultatif)</label>
          <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input 
              type="file" 
              id="cert-upload" 
              accept=".pdf,.jpg,.png" 
              style={{ display: 'none' }} 
              // 🌟 NOUVEAU : On capture le fichier sélectionné
              onChange={(e) => setFormData({...formData, certificateFile: e.target.files[0]})}
            />
            <label htmlFor="cert-upload" className="btn-outline" style={{ cursor: 'pointer', padding: '8px 16px', fontSize: '0.875rem', margin: 0, display: 'inline-block' }}>
              Choisir un fichier
            </label>
            {/* 🌟 NOUVEAU : On affiche le nom du fichier s'il y en a un */}
            <span style={{ color: formData.certificateFile ? 'var(--primary-dark)' : 'var(--text-muted)', fontSize: '0.875rem', fontWeight: formData.certificateFile ? 'bold' : 'normal' }}>
              {formData.certificateFile ? formData.certificateFile.name : "Aucun fichier sélectionné"}
            </span>
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
                alignItems: 'center'  }}
          >
            {loading ? "En attente..." : "Valider l'extraction"}
          </button>
        </div>
      </form>
    </div>
  );
}