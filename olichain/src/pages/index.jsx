import React, { useState, useEffect } from "react";
import { ArrowRight, Activity, Shield, Coins } from 'lucide-react';
import { Link } from 'react-router-dom';
import CreateLotForm from "../components/forms/CreateLotForm";
import { useWeb3 } from "../hooks/index";


export function HomePage() {
  return (
    <div>
      <div className="hero">
        <h1>Traçabilité & Transparence</h1>
        <p>
          OliChain révolutionne la filière oléicole. Suivez chaque goutte d'huile d'olive de l'arbre à la table, 
          et garantissez une rémunération équitable grâce aux Smart Contracts.
        </p>
        <Link to="/dashboard" style={{ textDecoration: 'none' }}>
          <button className="btn-primary">
            Accéder au Dashboard <ArrowRight size={18} />
          </button>
        </Link>
      </div>

      <div className="grid-3">
        <div className="card">
          <Shield size={32} color="var(--primary)" style={{ marginBottom: '16px' }} />
          <h3>Blockchain Sécurisée</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.5' }}>
            Chaque étape de production est enregistrée de manière immuable sur la blockchain Ethereum.
          </p>
        </div>
        <div className="card">
          <Activity size={32} color="var(--primary)" style={{ marginBottom: '16px' }} />
          <h3>Traçabilité Temps Réel</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.5' }}>
            Scannez le QR code sur la bouteille pour découvrir l'histoire complète de votre huile.
          </p>
        </div>
        <div className="card">
          <Coins size={32} color="var(--primary)" style={{ marginBottom: '16px' }} />
          <h3>Paiements Automatisés</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.5' }}>
            Les Smart Contracts répartissent instantanément les revenus entre tous les acteurs.
          </p>
        </div>
      </div>
    </div>
  );
}



export function DashboardPage() {
  const { oliveTrace } = useWeb3();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLots: 0,
    inTransit: 0,
    distributed: 0,
    totalKg: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!oliveTrace) return;
      
      try {
        setLoading(true);
        const total = await oliveTrace.totalLots();
        
        let inTransitCount = 0;
        let distributedCount = 0;
        let kgSum = 0;

        // On boucle sur tous les lots existants pour calculer les statistiques
        for (let i = 1; i <= Number(total); i++) {
          const lot = await oliveTrace.getLot(i);
          const status = Number(lot.status);
          const quantity = Number(lot.quantity);

          // Ajout au poids total
          kgSum += quantity;

          // Comptage par statut
          if (status === 2) {
            inTransitCount++; // En transit
          } else if (status === 3) {
            distributedCount++; // Distribué et payé
          }
        }

        setStats({
          totalLots: Number(total),
          inTransit: inTransitCount,
          distributed: distributedCount,
          totalKg: kgSum
        });

      } catch (error) {
        console.error("Erreur lors de la récupération des statistiques :", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [oliveTrace]);

  return (
    <div>
      <h2 style={{ marginBottom: '24px', color: 'var(--primary-dark)', fontFamily: 'var(--font-display)' }}>
        Vue d'ensemble
      </h2>
      
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--text-muted)' }}>Synchronisation avec la blockchain en cours...</p>
        </div>
      ) : (
        <div className="grid-3">
          {/* Carte 1 : Lots en transit */}
          <div className="card">
            <div className="stat-label">Lots en transit</div>
            <div className="stat-value">{stats.inTransit}</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '8px' }}>
              Sur {stats.totalLots} lot(s) au total
            </p>
          </div>

          {/* Carte 2 : Volume total */}
          <div className="card">
            <div className="stat-label">Volume tracé (Olives)</div>
            <div className="stat-value">{stats.totalKg.toLocaleString()} kg</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '8px' }}>
              Enregistré par les producteurs
            </p>
          </div>

          {/* Carte 3 : Lots terminés */}
          <div className="card">
            <div className="stat-label">Lots distribués & payés</div>
            <div className="stat-value">{stats.distributed}</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '8px' }}>
              Via les Smart Contracts
            </p>
          </div>
        </div>
      )}
    </div>
  );
}



export function ProducerPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="card">
      <h2 style={{ marginBottom: '16px', color: 'var(--primary-dark)', fontFamily: 'var(--font-display)' }}>
        Espace Producteur
      </h2>

      {!showForm && (
        <>
          <p style={{ color: 'var(--text-muted)' }}>
            Enregistrez vos nouvelles récoltes et suivez vos lots envoyés au moulin.
          </p>

          <button
            className="btn-primary"
            style={{ marginTop: '24px' }}
            onClick={() => setShowForm(true)}
          >
            + Déclarer une récolte
          </button>
        </>
      )}

      {showForm && (
        <div style={{ marginTop: '24px' }}>
          <CreateLotForm onSuccess={() => setShowForm(false)} />
          
          {/* LE BOUTON ANNULER CORRIGÉ */}
          <button
            className="btn-outline"
            style={{ 
              width: '100%', 
              marginTop: '12px', 
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
            onClick={() => setShowForm(false)}
            onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}

