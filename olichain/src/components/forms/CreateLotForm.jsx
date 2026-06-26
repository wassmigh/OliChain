// components/producer/CreateLotForm.jsx
// Formulaire de création d'un nouveau lot d'huile d'olive

import { useState } from "react";
import { useWeb3 } from "../../hooks/index";
import { useTransaction } from "../../hooks/index";
import { TxStatus } from "../common/index";
import { uploadJsonToIPFS } from "../../utils/formatters";

const OLIVE_VARIETIES = [
  "Chemlali", "Chetoui", "Zarrazi", "Meski", "Picual", "Koroneiki",
];

export default function CreateLotForm({ onSuccess }) {
  const { oliveTrace } = useWeb3();
  const { txHash, pending, success, txError, send, reset } = useTransaction();

  const [form, setForm] = useState({
    variety: "",
    quantity: "",
    location: "",
    harvestDate: "",
    notes: "",
  });
  const [file, setFile] = useState(null);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!oliveTrace) return;

    // 1. Upload des métadonnées + document sur IPFS
    let ipfsHash = "";
    try {
      const metadata = {
        variety: form.variety,
        harvestDate: form.harvestDate,
        location: form.location,
        notes: form.notes,
        createdAt: new Date().toISOString(),
      };
      ipfsHash = await uploadJsonToIPFS(metadata);
    } catch (err) {
      console.error("Erreur IPFS :", err);
    }

    // 2. Appel au smart contract
    await send(() =>
      oliveTrace.createLot(
        form.variety,
        Number(form.quantity),
        form.location,
        ipfsHash
      )
    );

    onSuccess?.();
  };

  // Styles partagés pour correspondre au thème de l'application
  const inputStyle = {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    marginTop: '6px',
    backgroundColor: '#fff',
    outline: 'none',
    transition: 'border-color 0.2s'
  };

  const labelStyle = {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: 'var(--primary-dark)',
    display: 'block'
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {/* Variété */}
        <div>
          <label style={labelStyle}>Variété d'olive</label>
          <select
            name="variety"
            value={form.variety}
            onChange={handleChange}
            required
            style={inputStyle}
          >
            <option value="">Sélectionner…</option>
            {OLIVE_VARIETIES.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Quantité */}
        <div>
          <label style={labelStyle}>Quantité récoltée (kg)</label>
          <input
            type="number"
            name="quantity"
            value={form.quantity}
            onChange={handleChange}
            min="1"
            required
            placeholder="Ex : 2500"
            style={inputStyle}
          />
        </div>

        {/* Localisation */}
        <div>
          <label style={labelStyle}>Localisation de la parcelle</label>
          <input
            type="text"
            name="location"
            value={form.location}
            onChange={handleChange}
            required
            placeholder="Ex : Zarzis, Tunisie"
            style={inputStyle}
          />
        </div>

        {/* Date de récolte */}
        <div>
          <label style={labelStyle}>Date de récolte</label>
          <input
            type="date"
            name="harvestDate"
            value={form.harvestDate}
            onChange={handleChange}
            required
            style={inputStyle}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label style={labelStyle}>Notes / observations</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={3}
          placeholder="Conditions climatiques, méthode de récolte, certifications…"
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>


      {/* Statut de la transaction */}
      <TxStatus txHash={txHash} pending={pending} success={success} txError={txError} onClose={reset} />

<button
  type="submit"
  disabled={pending}
  className="btn-primary"
  style={{ 
    width: '100%', 
    marginTop: '8px', 
    opacity: pending ? 0.7 : 1, 
    cursor: pending ? 'not-allowed' : 'pointer',
    display: 'flex',          
    justifyContent: 'center', 
    alignItems: 'center'      
  }}
>
  {pending ? "En attente de confirmation..." : "Créer le lot on-chain"}
</button>
    </form>
  );
}