// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./OliveTrace.sol";

/**
 * @title  OliPay
 * @notice Répartition automatique et instantanée des revenus de vente
 *         entre les acteurs de la filière oléicole.
 *
 * @dev    Principe :
 *         1. L'admin configure les parts (en basis points) pour chaque lot
 *            via `configureLot()` — uniquement producteur, moulin, transport.
 *         2. Le distributeur appelle `pay(lotId)` en attachant EXACTEMENT
 *            le montant dû aux autres acteurs (pas le prix de vente total).
 *            Sa marge = prix de vente − msg.value, qu'il conserve lui-même.
 *         3. Le contrat distribue les fonds atomiquement et informe
 *            OliveTrace de marquer le lot comme "Vendu".
 *
 *         Basis points (bps) : 1 bps = 0.01%.
 *         La somme des bps (producteur + moulin + transport) doit être
 *         exactement 10 000 — représentant 100% du msg.value envoyé,
 *         c'est-à-dire la part totale à reverser aux acteurs amont.
 *
 *         Exemple concret :
 *           Prix de vente final : 100 DT
 *           Le distributeur décide de reverser 92 DT aux acteurs amont.
 *           Il appelle pay(lotId) avec msg.value = 92 DT.
 *           → Producteur reçoit  55% de 92 DT = 50.6 DT
 *           → Moulin     reçoit  22% de 92 DT = 20.24 DT
 *           → Transport  reçoit  23% de 92 DT = 21.16 DT
 *           → Distributeur garde 8 DT (sa marge, jamais envoyée au contrat)
 *
 *         Sécurité :
 *         - Reentrancy guard manuel (sans dépendance externe)
 *         - Chaque lot ne peut être payé qu'une seule fois
 *         - Transport absorbe les arrondis (wei résiduels)
 */
contract OliPay {
────────────────────────────────────────────────────

    struct PaymentConfig {
        address producer;
        uint16 producerBps; 
        address mill;
        uint16 millBps;
        address transport;
        uint16 transportBps; 
        bool configured;
    }

    struct PaymentRecord {
        uint256 amount; 
        uint256 timestamp;
        address distributor;
    }



    address public owner;
    OliveTrace public oliveTrace;

    mapping(uint256 => PaymentConfig) private _configs;
    mapping(uint256 => PaymentRecord[]) private _history;
    mapping(uint256 => bool) private _paid;

    bool private _locked;


    event LotConfigured(
        uint256 indexed lotId,
        address producer,
        address mill,
        address transport
    );

    event PaymentDistributed(
        uint256 indexed lotId,
        uint256 amountDistributed, // = msg.value (part reversée aux acteurs)
        address indexed distributor,
        uint256 timestamp
    );

    event ShareSent(
        uint256 indexed lotId,
        address indexed recipient,
        uint256 amount,
        string role
    );


    modifier onlyOwner() {
        require(msg.sender == owner, "OliPay: owner requis");
        _;
    }

    modifier noReentrant() {
        require(!_locked, "OliPay: reentrancy detecte");
        _locked = true;
        _;
        _locked = false;
    }

    modifier notPaid(uint256 lotId) {
        require(!_paid[lotId], "OliPay: lot deja paye");
        _;
    }



    constructor(address _oliveTrace) {
        require(_oliveTrace != address(0), "OliPay: adresse OliveTrace nulle");
        owner = msg.sender;
        oliveTrace = OliveTrace(_oliveTrace);
    }



    /**
     * @notice Configure la répartition des revenus pour un lot donné.
     *         Seuls producteur, moulin et transport sont configurés ici.
     *         Le distributeur n'a pas de part : il envoie uniquement
     *         ce qu'il doit aux acteurs amont et conserve sa marge.
     *
     * @param lotId         Identifiant du lot dans OliveTrace
     * @param producer      Wallet du producteur
     * @param producerBps   Part du producteur (ex: 5500 = 55% du msg.value)
     * @param mill          Wallet du moulin
     * @param millBps       Part du moulin
     * @param transport     Wallet du transporteur
     * @param transportBps  Part du transporteur
     *
     * @dev  producerBps + millBps + transportBps doit valoir exactement 10 000.
     *       Ces 10 000 bps représentent 100% du msg.value envoyé par le
     *       distributeur lors de l'appel à pay() — pas le prix de vente total.
     */
    function configureLot(
        uint256 lotId,
        address producer,
        uint16 producerBps,
        address mill,
        uint16 millBps,
        address transport,
        uint16 transportBps
    ) external onlyOwner {
        require(producer != address(0), "OliPay: adresse producteur nulle");
        require(mill != address(0), "OliPay: adresse moulin nulle");
        require(transport != address(0), "OliPay: adresse transport nulle");

        require(producer != mill, "OliPay: producteur = moulin");
        require(producer != transport, "OliPay: producteur = transport");
        require(mill != transport, "OliPay: moulin = transport");

        uint256 total = uint256(producerBps) +
            uint256(millBps) +
            uint256(transportBps);
        require(total == 10_000, "OliPay: total bps != 10000");

        require(producerBps >= 100, "OliPay: part producteur < 1%");
        require(millBps >= 100, "OliPay: part moulin < 1%");
        require(transportBps >= 100, "OliPay: part transport < 1%");

        _configs[lotId] = PaymentConfig({
            producer: producer,
            producerBps: producerBps,
            mill: mill,
            millBps: millBps,
            transport: transport,
            transportBps: transportBps,
            configured: true
        });

        emit LotConfigured(lotId, producer, mill, transport);
    }



    /**
     * @notice Le distributeur reverse aux acteurs amont leur part du lot.
     *         msg.value = montant total à distribuer (pas le prix de vente).
     *         Le distributeur a déjà prélevé sa marge avant d'appeler cette fonction.
     *
     * @param  lotId  Identifiant du lot à payer
     *
     * @dev    Flux :
     *         1. Vérifie config + non-déjà-payé
     *         2. Calcule les parts de producteur et moulin via bps
     *         3. Le transport reçoit le reste (absorbe les arrondis en wei)
     *         4. Trois transferts atomiques — si l'un échoue, tout revert
     *         5. Informe OliveTrace → statut Sold
     */
    function pay(uint256 lotId) external payable noReentrant notPaid(lotId) {
        require(msg.value > 0, "OliPay: montant nul");

        PaymentConfig storage cfg = _configs[lotId];
        require(cfg.configured, "OliPay: lot non configure");

        uint256 toDistribute = msg.value;


        uint256 shareProducer = (toDistribute * cfg.producerBps) / 10_000;
        uint256 shareMill = (toDistribute * cfg.millBps) / 10_000;
        uint256 shareTransport = toDistribute - shareProducer - shareMill;

        _sendEther(cfg.producer, shareProducer, "producteur");
        _sendEther(cfg.mill, shareMill, "moulin");
        _sendEther(cfg.transport, shareTransport, "transport");

        _paid[lotId] = true;
        _history[lotId].push(
            PaymentRecord({
                amount: toDistribute,
                timestamp: block.timestamp,
                distributor: msg.sender
            })
        );


        oliveTrace.markAsSold(lotId, toDistribute, msg.sender);

        emit ShareSent(lotId, cfg.producer, shareProducer, "producteur");
        emit ShareSent(lotId, cfg.mill, shareMill, "moulin");
        emit ShareSent(lotId, cfg.transport, shareTransport, "transport");
        emit PaymentDistributed(
            lotId,
            toDistribute,
            msg.sender,
            block.timestamp
        );
    }


    function getPaymentConfig(
        uint256 lotId
    ) external view returns (PaymentConfig memory) {
        return _configs[lotId];
    }

    function getPaymentHistory(
        uint256 lotId
    ) external view returns (PaymentRecord[] memory) {
        return _history[lotId];
    }

    function isLotPaid(uint256 lotId) external view returns (bool) {
        return _paid[lotId];
    }



    /**
     * @dev Transfert via call() — recommandé depuis l'EIP-1884.
     *      transfer() et send() sont limités à 2300 gas et peuvent
     *      échouer si le destinataire est un contrat.
     */
    function _sendEther(
        address recipient,
        uint256 amount,
        string memory role
    ) internal {
        if (amount == 0) return;
        (bool ok, ) = recipient.call{value: amount}("");
        require(ok, string.concat("OliPay: transfert echoue pour ", role));
    }


    receive() external payable {
        revert("OliPay: utiliser pay()");
    }
    fallback() external payable {
        revert("OliPay: utiliser pay()");
    }
}
