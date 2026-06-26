import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function BottleLabel({ lotId}) {
  // ATTENTION POUR LE TEST SUR SMARTPHONE :
  // Si vous testez en local (localhost), votre téléphone ne comprendra pas "localhost".
  // Remplacez temporairement window.location.origin par l'adresse IP locale de votre ordinateur 
  // Exemple : const trackingUrl = `http://192.168.1.15:3000/track/${lotId}`;
  
  const trackingUrl = `http://192.168.0.146:3000/track/${lotId}`; // Remplacez par VOTRE IP

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '40px',
      backgroundColor: '#f5f5f0' // Couleur de fond (mur)
    }}>
      {/* La "Bouteille" / L'étiquette */}
      <div style={{
        width: '300px',
        backgroundColor: '#1a2e1a', // Vert olive très foncé
        borderRadius: '12px',
        padding: '30px 20px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        border: '2px solid #d4af37', // Bordure dorée
        color: '#f9f6e6',
        textAlign: 'center',
        fontFamily: 'serif'
      }}>
        
        {/* En-tête de l'étiquette */}
        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.5rem', color: '#d4af37', textTransform: 'uppercase', letterSpacing: '2px' }}>
          OliChain
        </h3>
        <p style={{ margin: '0 0 20px 0', fontSize: '0.9rem', fontStyle: 'italic', opacity: 0.8 }}>
          Huile d'Olive Extra Vierge
        </p>

        <div style={{ height: '1px', backgroundColor: '#d4af37', margin: '20px auto', width: '50%', opacity: 0.5 }}></div>

        
        <p style={{ margin: '0 0 20px 0', fontSize: '0.9rem', opacity: 0.8 }}>Lot #{lotId}</p>

        {/* Le QR Code (Fond blanc pour qu'il soit scannable) */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '15px', 
          borderRadius: '8px',
          display: 'inline-block',
          margin: '10px 0'
        }}>
          <QRCodeSVG 
            value={trackingUrl} 
            size={160} 
            level="H" 
            fgColor="#1a2e1a" 
          />
        </div>

        <p style={{ margin: '20px 0 0 0', fontSize: '0.8rem', color: '#d4af37', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Scannez pour tracer
        </p>
        <p style={{ margin: '5px 0 0 0', fontSize: '0.7rem', opacity: 0.6 }}>
          De l'arbre à votre table
        </p>

      </div>
    </div>
  );
}