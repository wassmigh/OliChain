// test/OliChain.test.js
const { expect }      = require("chai");
const { ethers }      = require("hardhat");
const { anyValue }    = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// ─────────────────────────────────────────────────────────
// FIXTURE — déployée une seule fois et réutilisée par snapshot
// ─────────────────────────────────────────────────────────
async function deployFixture() {
  const [owner, producer, mill, transport, distributor, buyer, stranger] =
    await ethers.getSigners();

  const OliveTrace = await ethers.getContractFactory("OliveTrace");
  const oliveTrace = await OliveTrace.deploy();

  const OliPay = await ethers.getContractFactory("OliPay");
  const oliPay = await OliPay.deploy(await oliveTrace.getAddress());

  // Lier les deux contrats
  await oliveTrace.setOliPayAddress(await oliPay.getAddress());

  // Assigner les rôles
  await oliveTrace.assignRole(producer.address,    "producer");
  await oliveTrace.assignRole(mill.address,        "mill");
  await oliveTrace.assignRole(transport.address,   "transport");
  await oliveTrace.assignRole(distributor.address, "distributor");

  return { oliveTrace, oliPay, owner, producer, mill, transport, distributor, buyer, stranger };
}

// Helper : crée un lot et fait toutes les étapes jusqu'à "Distributed"
async function fullLotFixture() {
  const base = await deployFixture();
  const { oliveTrace, oliPay, producer, mill, transport, distributor } = base;

  await oliveTrace.connect(producer).createLot("Chemlali", 2500, "Sfax", "ipfs://QmHarvest");
  await oliveTrace.connect(mill).addMillStep(1, 380, 30, "Extra vierge", "ipfs://QmMill");
  await oliveTrace.connect(transport).addTransportStep(1, "Tunis", 18, "ipfs://QmTransport");
  await oliveTrace.connect(distributor).addDistributionStep(1, "Carrefour Lac", "ipfs://QmDistrib");

  await oliPay.configureLot(
    1,
    producer.address,    5500,
    mill.address,        2000,
    transport.address,   1500,
    distributor.address, 1000
  );

  return { ...base, lotId: 1n };
}

// ─────────────────────────────────────────────────────────
// SUITE OliveTrace
// ─────────────────────────────────────────────────────────
describe("OliveTrace", function () {

  // ── Administration ──
  describe("Administration", function () {
    it("déploie avec le owner comme admin", async function () {
      const { oliveTrace, owner } = await loadFixture(deployFixture);
      expect(await oliveTrace.getRole(owner.address)).to.equal("admin");
    });

    it("assigne un rôle correctement", async function () {
      const { oliveTrace, producer } = await loadFixture(deployFixture);
      expect(await oliveTrace.getRole(producer.address)).to.equal("producer");
    });

    it("rejette un rôle invalide", async function () {
      const { oliveTrace, stranger } = await loadFixture(deployFixture);
      await expect(
        oliveTrace.assignRole(stranger.address, "hacker")
      ).to.be.revertedWith("OliveTrace: role invalide");
    });

    it("seul le owner peut assigner un rôle", async function () {
      const { oliveTrace, stranger } = await loadFixture(deployFixture);
      await expect(
        oliveTrace.connect(stranger).assignRole(stranger.address, "producer")
      ).to.be.revertedWith("OliveTrace: owner requis");
    });

    it("enregistre l'adresse OliPay", async function () {
      const { oliveTrace, oliPay } = await loadFixture(deployFixture);
      expect(await oliveTrace.oliPayAddress()).to.equal(await oliPay.getAddress());
    });
  });

  // ── Création de lot ──
  describe("createLot()", function () {
    it("crée un lot avec les bonnes données", async function () {
      const { oliveTrace, producer } = await loadFixture(deployFixture);
      await oliveTrace.connect(producer)
        .createLot("Chemlali", 2500, "Sfax", "ipfs://QmTest");

      const lot = await oliveTrace.getLot(1);
      expect(lot.id).to.equal(1n);
      expect(lot.producer).to.equal(producer.address);
      expect(lot.variety).to.equal("Chemlali");
      expect(lot.quantity).to.equal(2500n);
      expect(lot.status).to.equal(0); // Created
    });

    it("incrémente le compteur totalLots", async function () {
      const { oliveTrace, producer } = await loadFixture(deployFixture);
      await oliveTrace.connect(producer).createLot("Chetoui", 1000, "Tunis", "");
      await oliveTrace.connect(producer).createLot("Zalmati", 800,  "Sfax",  "");
      expect(await oliveTrace.totalLots()).to.equal(2n);
    });

    it("émet l'événement LotCreated", async function () {
      const { oliveTrace, producer } = await loadFixture(deployFixture);
      await expect(
        oliveTrace.connect(producer).createLot("Chemlali", 2500, "Sfax", "")
      )
        .to.emit(oliveTrace, "LotCreated")
        .withArgs(1n, producer.address, "Chemlali", 2500n);
    });

    it("enregistre l'étape Harvest automatiquement", async function () {
      const { oliveTrace, producer } = await loadFixture(deployFixture);
      await oliveTrace.connect(producer).createLot("Chemlali", 2500, "Sfax", "");
      const steps = await oliveTrace.getLotSteps(1);
      expect(steps.length).to.equal(1);
      expect(steps[0].stepType).to.equal(0); // Harvest
      expect(steps[0].actor).to.equal(producer.address);
    });

    it("ajoute le lot dans getLotsByActor", async function () {
      const { oliveTrace, producer } = await loadFixture(deployFixture);
      await oliveTrace.connect(producer).createLot("Chemlali", 2500, "Sfax", "");
      const lots = await oliveTrace.getLotsByActor(producer.address);
      expect(lots).to.deep.equal([1n]);
    });

    it("rejette une quantité nulle", async function () {
      const { oliveTrace, producer } = await loadFixture(deployFixture);
      await expect(
        oliveTrace.connect(producer).createLot("Chemlali", 0, "Sfax", "")
      ).to.be.revertedWith("OliveTrace: quantite nulle");
    });

    it("rejette une variété vide", async function () {
      const { oliveTrace, producer } = await loadFixture(deployFixture);
      await expect(
        oliveTrace.connect(producer).createLot("", 2500, "Sfax", "")
      ).to.be.revertedWith("OliveTrace: variete vide");
    });

    it("interdit à un non-producteur de créer un lot", async function () {
      const { oliveTrace, mill } = await loadFixture(deployFixture);
      await expect(
        oliveTrace.connect(mill).createLot("Chemlali", 2500, "Sfax", "")
      ).to.be.revertedWith("OliveTrace: role requis = producer");
    });
  });

  // ── Étapes ──
  describe("Étapes de la chaîne", function () {
    it("moulin : ajoute l'étape et change le statut en AtMill", async function () {
      const { oliveTrace, producer, mill } = await loadFixture(deployFixture);
      await oliveTrace.connect(producer).createLot("Chemlali", 2500, "Sfax", "");
      await oliveTrace.connect(mill).addMillStep(1, 380, 30, "Extra vierge", "");

      const lot = await oliveTrace.getLot(1);
      expect(lot.status).to.equal(1); // AtMill

      const steps = await oliveTrace.getLotSteps(1);
      expect(steps.length).to.equal(2);
      expect(steps[1].stepType).to.equal(1); // Milling
    });

    it("transport : change le statut en InTransit", async function () {
      const { oliveTrace, producer, mill, transport } = await loadFixture(deployFixture);
      await oliveTrace.connect(producer).createLot("Chemlali", 2500, "Sfax", "");
      await oliveTrace.connect(mill).addMillStep(1, 380, 30, "Extra vierge", "");
      await oliveTrace.connect(transport).addTransportStep(1, "Tunis", 18, "");

      expect((await oliveTrace.getLot(1)).status).to.equal(2); // InTransit
    });

    it("distribution : change le statut en Distributed", async function () {
      const { oliveTrace, producer, mill, transport, distributor } =
        await loadFixture(deployFixture);
      await oliveTrace.connect(producer).createLot("Chemlali", 2500, "Sfax", "");
      await oliveTrace.connect(mill).addMillStep(1, 380, 30, "Extra vierge", "");
      await oliveTrace.connect(transport).addTransportStep(1, "Tunis", 18, "");
      await oliveTrace.connect(distributor).addDistributionStep(1, "Carrefour", "");

      expect((await oliveTrace.getLot(1)).status).to.equal(3); // Distributed
    });

    it("rejette le pressage si le lot n'est pas en statut Created", async function () {
      const { oliveTrace, producer, mill } = await loadFixture(deployFixture);
      await oliveTrace.connect(producer).createLot("Chemlali", 2500, "Sfax", "");
      await oliveTrace.connect(mill).addMillStep(1, 380, 30, "Extra vierge", "");
      // Tente un second pressage
      await expect(
        oliveTrace.connect(mill).addMillStep(1, 100, 40, "Vierge", "")
      ).to.be.revertedWith("OliveTrace: statut invalide pour pressage");
    });

    it("rejette le transport si le lot n'est pas AtMill", async function () {
      const { oliveTrace, producer, transport } = await loadFixture(deployFixture);
      await oliveTrace.connect(producer).createLot("Chemlali", 2500, "Sfax", "");
      await expect(
        oliveTrace.connect(transport).addTransportStep(1, "Tunis", 18, "")
      ).to.be.revertedWith("OliveTrace: statut invalide pour transport");
    });

    it("interdit au mauvais rôle d'ajouter une étape", async function () {
      const { oliveTrace, producer, stranger } = await loadFixture(deployFixture);
      await oliveTrace.connect(producer).createLot("Chemlali", 2500, "Sfax", "");
      await expect(
        oliveTrace.connect(stranger).addMillStep(1, 380, 30, "Extra vierge", "")
      ).to.be.revertedWith("OliveTrace: role requis = mill");
    });

    it("markAsSold ne peut être appelé que par OliPay", async function () {
      const { oliveTrace, stranger } = await loadFixture(deployFixture);
      await expect(
        oliveTrace.connect(stranger).markAsSold(1, 1000n, stranger.address)
      ).to.be.revertedWith("OliveTrace: appelant non autorise");
    });
  });
});

// ─────────────────────────────────────────────────────────
// SUITE OliPay
// ─────────────────────────────────────────────────────────
describe("OliPay", function () {

  // ── Configuration ──
  describe("configureLot()", function () {
    it("enregistre la configuration correctement", async function () {
      const { oliPay, producer, mill, transport, distributor } =
        await loadFixture(deployFixture);
      await oliPay.configureLot(
        1, producer.address, 5500, mill.address, 2000,
        transport.address, 1500, distributor.address, 1000
      );
      const cfg = await oliPay.getPaymentConfig(1);
      expect(cfg.producerBps).to.equal(5500);
      expect(cfg.configured).to.be.true;
    });

    it("rejette si la somme des bps ≠ 10000", async function () {
      const { oliPay, producer, mill, transport, distributor } =
        await loadFixture(deployFixture);
      await expect(
        oliPay.configureLot(
          1, producer.address, 5000, mill.address, 2000,
          transport.address, 1500, distributor.address, 1000   // total = 9500
        )
      ).to.be.revertedWith("OliPay: total bps != 10000");
    });

    it("rejette si une adresse est nulle", async function () {
      const { oliPay, mill, transport, distributor } =
        await loadFixture(deployFixture);
      await expect(
        oliPay.configureLot(
          1, ethers.ZeroAddress, 5500, mill.address, 2000,
          transport.address, 1500, distributor.address, 1000
        )
      ).to.be.revertedWith("OliPay: adresse producteur nulle");
    });

    it("rejette si une part est < 1%", async function () {
      const { oliPay, producer, mill, transport, distributor } =
        await loadFixture(deployFixture);
      await expect(
        oliPay.configureLot(
          1, producer.address, 9701, mill.address, 99,   // millBps < 100
          transport.address, 100, distributor.address, 100
        )
      ).to.be.revertedWith("OliPay: part moulin < 1%");
    });

    it("seul le owner peut configurer", async function () {
      const { oliPay, stranger, producer, mill, transport, distributor } =
        await loadFixture(deployFixture);
      await expect(
        oliPay.connect(stranger).configureLot(
          1, producer.address, 5500, mill.address, 2000,
          transport.address, 1500, distributor.address, 1000
        )
      ).to.be.revertedWith("OliPay: owner requis");
    });
  });

  // ── Paiement ──
  describe("pay()", function () {
    it("distribue les montants corrects à chaque acteur", async function () {
      const { oliPay, buyer, producer, mill, transport, distributor } =
        await loadFixture(fullLotFixture);

      const salePrice = ethers.parseEther("10");

      const balBefore = {
        producer:    await ethers.provider.getBalance(producer.address),
        mill:        await ethers.provider.getBalance(mill.address),
        transport:   await ethers.provider.getBalance(transport.address),
        distributor: await ethers.provider.getBalance(distributor.address),
      };

      await oliPay.connect(buyer).pay(1, { value: salePrice });

      const balAfter = {
        producer:    await ethers.provider.getBalance(producer.address),
        mill:        await ethers.provider.getBalance(mill.address),
        transport:   await ethers.provider.getBalance(transport.address),
        distributor: await ethers.provider.getBalance(distributor.address),
      };

      // 55% de 10 ETH = 5.5 ETH
      expect(balAfter.producer - balBefore.producer)
        .to.equal(ethers.parseEther("5.5"));
      // 20% = 2 ETH
      expect(balAfter.mill - balBefore.mill)
        .to.equal(ethers.parseEther("2.0"));
      // 15% = 1.5 ETH
      expect(balAfter.transport - balBefore.transport)
        .to.equal(ethers.parseEther("1.5"));
      // 10% = 1 ETH
      expect(balAfter.distributor - balBefore.distributor)
        .to.equal(ethers.parseEther("1.0"));
    });

    it("émet PaymentDistributed avec le bon montant", async function () {
      const { oliPay, buyer } = await loadFixture(fullLotFixture);
      await expect(
        oliPay.connect(buyer).pay(1, { value: ethers.parseEther("10") })
      )
        .to.emit(oliPay, "PaymentDistributed")
        .withArgs(1n, ethers.parseEther("10"), anyValue);
    });

    it("émet ShareSent pour chaque acteur", async function () {
      const { oliPay, buyer, producer } = await loadFixture(fullLotFixture);
      await expect(
        oliPay.connect(buyer).pay(1, { value: ethers.parseEther("10") })
      )
        .to.emit(oliPay, "ShareSent")
        .withArgs(1n, producer.address, ethers.parseEther("5.5"), "producteur");
    });

    it("marque le lot comme payé (anti-double paiement)", async function () {
      const { oliPay, buyer } = await loadFixture(fullLotFixture);
      await oliPay.connect(buyer).pay(1, { value: ethers.parseEther("10") });
      await expect(
        oliPay.connect(buyer).pay(1, { value: ethers.parseEther("10") })
      ).to.be.revertedWith("OliPay: lot deja paye");
    });

    it("marque le lot Sold dans OliveTrace", async function () {
      const { oliPay, oliveTrace, buyer } = await loadFixture(fullLotFixture);
      await oliPay.connect(buyer).pay(1, { value: ethers.parseEther("10") });
      const lot = await oliveTrace.getLot(1);
      expect(lot.status).to.equal(4); // Sold
    });

    it("enregistre l'étape Sale dans OliveTrace", async function () {
      const { oliPay, oliveTrace, buyer } = await loadFixture(fullLotFixture);
      await oliPay.connect(buyer).pay(1, { value: ethers.parseEther("10") });
      const steps = await oliveTrace.getLotSteps(1);
      // Harvest + Mill + Transport + Distribution + Sale = 5
      expect(steps.length).to.equal(5);
      expect(steps[4].stepType).to.equal(4); // Sale
    });

    it("enregistre l'historique de paiement", async function () {
      const { oliPay, buyer } = await loadFixture(fullLotFixture);
      await oliPay.connect(buyer).pay(1, { value: ethers.parseEther("10") });
      const history = await oliPay.getPaymentHistory(1);
      expect(history.length).to.equal(1);
      expect(history[0].amount).to.equal(ethers.parseEther("10"));
      expect(history[0].payer).to.equal(buyer.address);
    });

    it("rejette un montant nul", async function () {
      const { oliPay, buyer } = await loadFixture(fullLotFixture);
      await expect(
        oliPay.connect(buyer).pay(1, { value: 0n })
      ).to.be.revertedWith("OliPay: montant nul");
    });

    it("rejette si le lot n'est pas configuré", async function () {
      const { oliPay, buyer } = await loadFixture(deployFixture);
      await expect(
        oliPay.connect(buyer).pay(99, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("OliPay: lot non configure");
    });

    it("rejette les dépôts directs (receive/fallback)", async function () {
      const { oliPay, buyer } = await loadFixture(deployFixture);
      await expect(
        buyer.sendTransaction({ to: await oliPay.getAddress(), value: ethers.parseEther("1") })
      ).to.be.revertedWith("OliPay: utiliser pay()");
    });

    it("fonctionne avec des petits montants (arrondis)", async function () {
      const { oliPay, buyer, producer, mill, transport, distributor } =
        await loadFixture(fullLotFixture);

      // 7 wei — teste la robustesse des arrondis entiers
      const tiny = 7n;
      const balBefore = await ethers.provider.getBalance(producer.address);
      await oliPay.connect(buyer).pay(1, { value: tiny });
      const balAfter = await ethers.provider.getBalance(producer.address);
      // 55% de 7 = 3 (floor) — le reste va au distributeur
      expect(balAfter - balBefore).to.equal(3n);
    });
  });
});
