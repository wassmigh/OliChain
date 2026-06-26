import React, { useState, useEffect } from "react";
import { useWeb3 } from "../hooks/index";
import ProcessLotForm from "../components/forms/ProcessLotForm";
import TransportLotForm from "../components/forms/TransportLotForm";
import ReceiveAndPayForm from "../components/forms/ReceiveAndPayForm";
import ConfigureLotForm from "../components/forms/ConfigureLotForm";
import { useParams } from "react-router-dom";
import { ethers } from "ethers";
import BottleLabel from "../components/BottleSimulation/BottleLabel";
import { OLIVE_TRACE_ABI, CONTRACT_ADDRESSES } from "../utils/contracts";

export function MillPage() {
  const { oliveTrace } = useWeb3();
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLot, setSelectedLot] = useState(null);

  const fetchLots = async () => {
    if (!oliveTrace) return;
    setLoading(true);
    try {
      const total = await oliveTrace.totalLots();
      const availableLots = [];

      for (let i = 1; i <= Number(total); i++) {
        const lot = await oliveTrace.getLot(i);
        // Statut 0 = Created (en attente du moulin)
        if (Number(lot.status) === 0) {
          availableLots.push(lot);
        }
      }
      setLots(availableLots);
    } catch (error) {
      console.error("Erreur lors de la récupération des lots:", error);
    }
    setLoading(false);
  };

  // On charge les lots au montage du composant
  useEffect(() => {
    fetchLots();
  }, [oliveTrace]);

  // Fonction appelée quand le formulaire a réussi
  const handleSuccess = () => {
    setSelectedLot(null); // Ferme le formulaire
    fetchLots(); // Rafraîchit la liste (le lot traité va disparaître)
  };

  return (
    <div className="card">
      <h2
        style={{
          marginBottom: "16px",
          color: "var(--primary-dark)",
          fontFamily: "var(--font-display)",
        }}
      >
        Espace Moulinier
      </h2>

      {!selectedLot && (
        <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
          Sélectionnez un lot d'olives en attente pour enregistrer l'extraction
          de l'huile.
        </p>
      )}

      {/* LISTE DES LOTS EN ATTENTE */}
      {!selectedLot && (
        <div>
          {loading ? (
            <p>Chargement des lots...</p>
          ) : lots.length === 0 ? (
            <div
              style={{
                padding: "20px",
                backgroundColor: "#f9fafb",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              <p style={{ color: "var(--text-muted)" }}>
                Aucun lot en attente de pressage.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {lots.map((lot) => (
                <div
                  key={Number(lot.id)}
                  style={{
                    border: "1px solid var(--border)",
                    padding: "16px",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <h4 style={{ margin: "0 0 4px 0" }}>
                      Lot #{Number(lot.id)} - {lot.variety}
                    </h4>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.875rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      Quantité reçue : {Number(lot.quantity)} kg
                    </p>
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() => setSelectedLot(lot)}
                    style={{ margin: 0 }}
                  >
                    Presser ce lot
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AFFICHAGE DU FORMULAIRE SI UN LOT EST SÉLECTIONNÉ */}
      {selectedLot && (
        <ProcessLotForm
          lot={selectedLot}
          onSuccess={handleSuccess}
          onCancel={() => setSelectedLot(null)}
        />
      )}
    </div>
  );
}

export function TransportPage() {
  const { oliveTrace } = useWeb3();
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLot, setSelectedLot] = useState(null);

  const fetchLots = async () => {
    if (!oliveTrace) return;
    setLoading(true);
    try {
      const total = await oliveTrace.totalLots();
      const availableLots = [];

      for (let i = 1; i <= Number(total); i++) {
        const lot = await oliveTrace.getLot(i);
        // Statut 1 = AtMill (Pressé, en attente de transport)
        if (Number(lot.status) === 1) {
          availableLots.push(lot);
        }
      }
      setLots(availableLots);
    } catch (error) {
      console.error("Erreur lors de la récupération des lots:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLots();
  }, [oliveTrace]);

  const handleSuccess = () => {
    setSelectedLot(null);
    fetchLots();
  };

  return (
    <div className="card">
      <h2
        style={{
          marginBottom: "16px",
          color: "var(--primary-dark)",
          fontFamily: "var(--font-display)",
        }}
      >
        Espace Transporteur
      </h2>

      {!selectedLot && (
        <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
          Sélectionnez un lot prêt au moulin pour démarrer son transport vers le
          distributeur.
        </p>
      )}

      {/* LISTE DES LOTS PRÊTS AU TRANSPORT */}
      {!selectedLot && (
        <div>
          {loading ? (
            <p>Chargement des lots...</p>
          ) : lots.length === 0 ? (
            <div
              style={{
                padding: "20px",
                backgroundColor: "#f9fafb",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              <p style={{ color: "var(--text-muted)" }}>
                Aucun lot en attente de transport.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {lots.map((lot) => (
                <div
                  key={Number(lot.id)}
                  style={{
                    border: "1px solid var(--border)",
                    padding: "16px",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <h4 style={{ margin: "0 0 4px 0" }}>
                      Lot #{Number(lot.id)} - {lot.variety}
                    </h4>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.875rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      Prêt à être récupéré au moulin.
                    </p>
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() => setSelectedLot(lot)}
                    style={{ margin: 0 }}
                  >
                    Transporter ce lot
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FORMULAIRE DE TRANSPORT */}
      {selectedLot && (
        <TransportLotForm
          lot={selectedLot}
          onSuccess={handleSuccess}
          onCancel={() => setSelectedLot(null)}
        />
      )}
    </div>
  );
}

export function DistributorPage() {
  const { oliveTrace } = useWeb3();
  const [lots, setLots] = useState([]);
  const [receivedLots, setReceivedLots] = useState([]); // NOUVEAU : Pour stocker les lots déjà réceptionnés
  const [loading, setLoading] = useState(true);
  const [selectedLot, setSelectedLot] = useState(null);
  const [qrLotId, setQrLotId] = useState(""); // NOUVEAU : ID du lot pour le QR code

  const fetchLots = async () => {
    if (!oliveTrace) return;
    setLoading(true);
    try {
      const total = await oliveTrace.totalLots();
      const availableLots = [];
      const received = [];

      for (let i = 1; i <= Number(total); i++) {
        const lot = await oliveTrace.getLot(i);
        // Statut 2 = InTransit (En cours de transport, prêt à être réceptionné)
        if (Number(lot.status) === 2) {
          availableLots.push(lot);
        }
        // Statut 3 = Distributed (Réceptionné par le distributeur, prêt pour le QR code)
        if (Number(lot.status) >= 3) {
          received.push(lot);
        }
      }
      setLots(availableLots);
      setReceivedLots(received); // On sauvegarde les lots réceptionnés
    } catch (error) {
      console.error("Erreur lors de la récupération des lots:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLots();
  }, [oliveTrace]);

  const handleSuccess = () => {
    setSelectedLot(null);
    fetchLots();
  };

  return (
    <div className="card">
      <h2
        style={{
          marginBottom: "16px",
          color: "var(--primary-dark)",
          fontFamily: "var(--font-display)",
        }}
      >
        Espace Distributeur
      </h2>

      {/* SECTION : GÉNÉRATION DU QR CODE (MODIFIÉE AVEC LE SELECT) */}
      <div
        style={{
          marginBottom: "30px",
          padding: "20px",
          backgroundColor: "#f0fdf4",
          borderRadius: "8px",
          border: "1px solid #bbf7d0",
        }}
      >
        <h3
          style={{ fontSize: "1.1rem", marginBottom: "12px", color: "#166534" }}
        >
          Générer une étiquette
        </h3>
        <p
          style={{
            fontSize: "0.875rem",
            color: "#15803d",
            marginBottom: "16px",
          }}
        >
          Sélectionnez un lot réceptionné pour générer son étiquette physique
          avec QR Code.
        </p>

        <div style={{ display: "flex", gap: "10px", maxWidth: "400px" }}>
          <select
            value={qrLotId}
            onChange={(e) => setQrLotId(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              flex: 1,
              backgroundColor: "white",
            }}
          >
            <option value="">-- Sélectionnez un lot réceptionné --</option>
            {receivedLots.map((lot) => (
              <option key={Number(lot.id)} value={Number(lot.id)}>
                Lot #{Number(lot.id)} - {lot.variety}
              </option>
            ))}
          </select>
        </div>

        {/* Affichage de l'étiquette avec la vraie variété du lot */}
        {qrLotId && (
          <BottleLabel
            lotId={qrLotId}
            variety={
              receivedLots.find((l) => Number(l.id) === Number(qrLotId))
                ?.variety
            }
          />
        )}
      </div>

      {/* TEXTE D'INTRODUCTION */}
      {!selectedLot && (
        <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
          Réceptionnez les lots en transit et déclenchez le paiement automatique
          des acteurs de la chaîne.
        </p>
      )}

      {/* LISTE DES LOTS EN TRANSIT */}
      {!selectedLot && (
        <div>
          {loading ? (
            <p>Chargement des lots...</p>
          ) : lots.length === 0 ? (
            <div
              style={{
                padding: "20px",
                backgroundColor: "#f9fafb",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              <p style={{ color: "var(--text-muted)" }}>
                Aucun lot en cours d'acheminement.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {lots.map((lot) => (
                <div
                  key={Number(lot.id)}
                  style={{
                    border: "1px solid var(--border)",
                    padding: "16px",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <h4 style={{ margin: "0 0 4px 0" }}>
                      Lot #{Number(lot.id)} - {lot.variety}
                    </h4>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.875rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      En transit vers vos entrepôts.
                    </p>
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() => setSelectedLot(lot)}
                    style={{ margin: 0 }}
                  >
                    Réceptionner et Payer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FORMULAIRE DE RÉCEPTION ET PAIEMENT */}
      {selectedLot && (
        <ReceiveAndPayForm
          lot={selectedLot}
          onSuccess={handleSuccess}
          onCancel={() => setSelectedLot(null)}
        />
      )}
    </div>
  );
}

export function AdminPage() {
  const { oliveTrace, oliPay } = useWeb3();
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLot, setSelectedLot] = useState(null);

  const fetchLots = async () => {
    if (!oliveTrace || !oliPay) return;
    setLoading(true);
    try {
      const total = await oliveTrace.totalLots();
      const unconfiguredLots = [];

      for (let i = 1; i <= Number(total); i++) {
        const lot = await oliveTrace.getLot(i);
        // On vérifie si le lot est déjà configuré dans OliPay
        const config = await oliPay.getPaymentConfig(i);

        // Si le lot n'est pas encore vendu (statut < 4) ET n'est pas configuré
        if (Number(lot.status) < 4 && !config.configured) {
          unconfiguredLots.push(lot);
        }
      }
      setLots(unconfiguredLots);
    } catch (error) {
      console.error("Erreur lors de la récupération des lots:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLots();
  }, [oliveTrace, oliPay]);

  return (
    <div className="card">
      <h2
        style={{
          marginBottom: "16px",
          color: "var(--primary-dark)",
          fontFamily: "var(--font-display)",
        }}
      >
        Administration
      </h2>

      {!selectedLot && (
        <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
          Configurez la répartition des paiements pour les lots en cours.
        </p>
      )}

      {/* LISTE DES LOTS NON CONFIGURÉS */}
      {!selectedLot && (
        <div>
          {loading ? (
            <p>Chargement des lots...</p>
          ) : lots.length === 0 ? (
            <div
              style={{
                padding: "20px",
                backgroundColor: "#f9fafb",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              <p style={{ color: "var(--text-muted)" }}>
                Tous les lots actifs sont déjà configurés.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {lots.map((lot) => (
                <div
                  key={Number(lot.id)}
                  style={{
                    border: "1px solid var(--border)",
                    padding: "16px",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <h4 style={{ margin: "0 0 4px 0" }}>
                      Lot #{Number(lot.id)} - {lot.variety}
                    </h4>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.875rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      Statut actuel : {Number(lot.status)}
                    </p>
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() => setSelectedLot(lot)}
                    style={{ margin: 0 }}
                  >
                    Configurer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FORMULAIRE DE CONFIGURATION */}
      {selectedLot && (
        <ConfigureLotForm
          lot={selectedLot}
          onSuccess={() => {
            setSelectedLot(null);
            fetchLots();
          }}
          onCancel={() => setSelectedLot(null)}
        />
      )}
    </div>
  );
}

export function TrackPage() {
  const { lotId } = useParams();
  const [lot, setLot] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLotData = async () => {
      try {
        setLoading(true);

        // Provider public (Lecture seule, SANS MetaMask)
        const provider = new ethers.JsonRpcProvider("http://10.10.71.244:8545");

        const oliveTrace = new ethers.Contract(
          CONTRACT_ADDRESSES.oliveTrace,
          OLIVE_TRACE_ABI,
          provider,
        );

        const lotData = await oliveTrace.getLot(lotId);
        const stepsData = await oliveTrace.getLotSteps(lotId);

        setLot(lotData);
        setSteps(stepsData);
      } catch (err) {
        console.error(err);
        setError(
          "Impossible de trouver ce lot sur la blockchain. Il n'existe peut-être pas.",
        );
      } finally {
        setLoading(false);
      }
    };

    if (lotId) {
      fetchLotData();
    }
  }, [lotId]);

  if (loading)
    return (
      <div style={{ padding: "40px", textAlign: "center", fontSize: "1.2rem" }}>
        Recherche sur la blockchain... 🔍
      </div>
    );
  if (error)
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          color: "red",
          fontWeight: "bold",
        }}
      >
        {error}
      </div>
    );
  if (!lot)
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        Lot introuvable.
      </div>
    );

  const formatDate = (timestamp) => {
    return new Date(Number(timestamp) * 1000).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const stepNames = [
    "Création (Producteur)",
    "Pressage (Moulin)",
    "Transport",
    "Distribution",
  ];
  const stepIcons = ["🌱", "⚙️", "🚚", "🏪"];

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "20px",
        fontFamily: "sans-serif",
      }}
    >
      {/* En-tête du Lot */}
      <div
        style={{
          backgroundColor: "#1a2e1a",
          color: "#f9f6e6",
          padding: "30px",
          borderRadius: "12px",
          textAlign: "center",
          marginBottom: "40px",
          border: "2px solid #d4af37",
          boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
        }}
      >
        <h2
          style={{
            color: "#d4af37",
            margin: "0 0 10px 0",
            textTransform: "uppercase",
            letterSpacing: "2px",
            fontSize: "1rem",
          }}
        >
          Huile d'Olive Extra Vierge
        </h2>
        <h1
          style={{
            margin: "0 0 20px 0",
            fontSize: "2.5rem",
            fontFamily: "serif",
          }}
        >
          Lot #{Number(lot.id)}
        </h1>

        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            borderTop: "1px solid rgba(212, 175, 55, 0.3)",
            paddingTop: "20px",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "0.8rem",
                opacity: 0.8,
                textTransform: "uppercase",
              }}
            >
              Variété
            </p>
            <p style={{ margin: 0, fontSize: "1.2rem", fontWeight: "bold" }}>
              {lot.variety}
            </p>
          </div>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "0.8rem",
                opacity: 0.8,
                textTransform: "uppercase",
              }}
            >
              Volume Initial
            </p>
            <p style={{ margin: 0, fontSize: "1.2rem", fontWeight: "bold" }}>
              {Number(lot.quantity)} Kg
            </p>
          </div>
        </div>
      </div>

      {/* Timeline de Traçabilité */}
      <h3
        style={{
          color: "#166534",
          marginBottom: "20px",
          fontSize: "1.5rem",
          borderBottom: "2px solid #f0fdf4",
          paddingBottom: "10px",
        }}
      >
        Parcours de la bouteille
      </h3>

      <div style={{ position: "relative", paddingLeft: "20px" }}>
        <div
          style={{
            position: "absolute",
            left: "34px",
            top: "20px",
            bottom: "20px",
            width: "3px",
            backgroundColor: "#dcfce7",
          }}
        ></div>

        {steps
          .filter((step) => Number(step.stepType) !== 4)
          .map((step, index) => {
            const stepType = Number(step.stepType);
            return (
              <div
                key={index}
                style={{
                  display: "flex",
                  gap: "20px",
                  marginBottom: "30px",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: "white",
                    border: "3px solid #22c55e",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1rem",
                    zIndex: 1,
                    flexShrink: 0,
                  }}
                >
                  {stepIcons[stepType]}
                </div>

                <div
                  style={{
                    flex: 1,
                    backgroundColor: "white",
                    padding: "16px",
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.02)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "12px",
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                        color: "#166534",
                        fontSize: "1.1rem",
                      }}
                    >
                      {stepNames[stepType]}
                    </h4>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "#6b7280",
                        backgroundColor: "#f3f4f6",
                        padding: "4px 8px",
                        borderRadius: "12px",
                      }}
                    >
                      {formatDate(step.timestamp)}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: "0 0 12px 0",
                      fontSize: "0.875rem",
                      color: "#4b5563",
                    }}
                  >
                    <strong>Validé par :</strong>{" "}
                    <span
                      style={{
                        fontFamily: "monospace",
                        backgroundColor: "#f3f4f6",
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      {step.actor.substring(0, 6)}...{step.actor.substring(38)}
                    </span>
                  </p>

                  {step.data && (
                    <div
                      style={{
                        backgroundColor: "#f8fafc",
                        padding: "12px",
                        borderRadius: "8px",
                        fontSize: "0.875rem",
                        color: "#334155",
                        borderLeft: "3px solid #cbd5e1",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: "bold",
                          display: "block",
                          marginBottom: "4px",
                        }}
                      >
                        Détails enregistrés :
                      </span>
                      {step.data}
                    </div>
                  )}

                  {/* Affichage de l'image IPFS si elle existe (sauf pour le producteur) */}
                  {step.ipfsHash &&
                    step.ipfsHash !== "ipfs://placeholder" &&
                    step.ipfsHash !== "" &&
                    stepType !== 0 && (
                      <div style={{ marginTop: "12px" }}>
                        <span
                          style={{
                            fontWeight: "bold",
                            display: "block",
                            marginBottom: "8px",
                            fontSize: "0.875rem",
                            color: "#166534",
                          }}
                        >
                          📎 Certificat d'analyse :
                        </span>
                        {/* On utilise la passerelle publique de Pinata pour afficher l'image */}
                        <img
                          src={`https://gateway.pinata.cloud/ipfs/${step.ipfsHash.replace("ipfs://", "")}`}
                          alt="Certificat"
                          style={{
                            maxWidth: "100%",
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb",
                          }}
                          onError={(e) => {
                            // Si ce n'est pas une image (ex: un PDF), on affiche un lien cliquable
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "block";
                          }}
                        />
                        <a
                          href={`https://gateway.pinata.cloud/ipfs/${step.ipfsHash.replace("ipfs://", "")}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "none",
                            color: "#2563eb",
                            textDecoration: "underline",
                            fontSize: "0.875rem",
                          }}
                        >
                          Voir le document complet (PDF/Autre)
                        </a>
                      </div>
                    )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Badge de certification Blockchain */}
      <div
        style={{
          marginTop: "40px",
          textAlign: "center",
          padding: "24px",
          backgroundColor: "#f0fdf4",
          borderRadius: "12px",
          border: "2px dashed #4ade80",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#15803d",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontSize: "1.1rem",
          }}
        >
          <span>🛡️</span> Certifié par la Blockchain
        </p>
        <p
          style={{
            margin: "8px 0 0 0",
            fontSize: "0.875rem",
            color: "#166534",
          }}
        >
          Toutes ces informations sont immuables et infalsifiables. Elles ont
          été vérifiées par des Smart Contracts.
        </p>
      </div>
    </div>
  );
}
