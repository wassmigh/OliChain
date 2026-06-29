# OliChain 🫒
OliChain est une application décentralisée (DApp) innovante conçue pour apporter une transparence totale à la chaîne d'approvisionnement en huile d'olive. Grâce à la technologie blockchain, nous garantissons l'authenticité et la traçabilité de chaque bouteille, du producteur jusqu'au consommateur.
## 🛠️ Architecture Technique
- **Blockchain Locale** : Le projet s'appuie sur une blockchain locale dédiée, nommée **olichain**, permettant de simuler, développer et valider les transactions en toute indépendance et sécurité.
- **Docker** : L'ensemble de l'environnement de développement et de la DApp est entièrement conteneurisé avec **Docker**, ce qui garantit un déploiement simple, rapide et reproductible pour n'importe quel développeur.
## 📊 Tableau de bord (Dashboard)
Notre tableau de bord interactif permet aux acteurs de la chaîne de suivre la production, la distribution et les certifications en temps réel.
<div align="center">
  <img src="Capture d'écran 2026-06-26 150728.png" alt="Aperçu du Dashboard OliChain" width="800"/>
  <br/>
  <em>(Aperçu de notre Dashboard)</em>
</div>
## 🏷️ Traçabilité : Sticker & QR Code
Chaque bouteille d'huile d'olive OliChain est munie d'un sticker doté d'un QR code unique. En scannant ce code, le consommateur accède à tout l'historique de son huile (origine des olives, méthodes agricoles, date de récolte, pressage, et certifications).
<div align="center">
  <img src="Capture d'écran 2026-06-29 084600.png" alt="Sticker QR Code OliChain" width="400"/>
  <br/>
  <em>(Sticker placé sur chaque bouteille avec le QR code d'historique)</em>
</div>
---
### 🚀 Démarrage Rapide
1. **Cloner le projet :**
   ```bash
   git clone <votre_lien_github>
   cd OliChain
   ```
2. **Lancer l'environnement Docker (incluant la blockchain `olichain`) :**
   ```bash
   docker-compose up -d
   ```
