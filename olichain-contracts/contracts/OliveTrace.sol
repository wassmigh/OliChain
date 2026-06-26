// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  OliveTrace
 * @notice Traçabilité immuable de la filière oléicole.
 *         Chaque lot d'olives est enregistré avec ses étapes :
 *         Récolte → Pressage → Transport → Distribution.
 *
 * @dev    Déployé sur Polygon Amoy (chainId 80002).
 *         Les documents (PDF, photos) sont stockés sur IPFS ;
 *         seul leur CID (hash) est inscrit on-chain.
 */
contract OliveTrace {

    /// @notice Statut courant d'un lot
    enum LotStatus {
        Created,      
        AtMill,       
        InTransit,    
        Distributed,  
        Sold          
    }

    /// @notice Type d'étape enregistrée dans l'historique
    enum StepType {
        Harvest,     
        Milling,      
        Transport,    
        Distribution, 
        Sale          
    }



    struct Lot {
        uint256 id;
        address producer;
        string  variety;       
        uint256 harvestDate;    
        uint256 quantity;      
        LotStatus status;
        string  ipfsHash;       
    }

    struct Step {
        StepType stepType;
        address  actor;         
        uint256  timestamp;
        string   data;          
        string   ipfsHash;      
    }



    address public owner;

    uint256 private _lotCounter;

    mapping(address => string) private _roles;

    mapping(uint256 => Lot) private _lots;

    mapping(uint256 => Step[]) private _steps;

    mapping(address => uint256[]) private _lotsByActor;

    address public oliPayAddress;


    event LotCreated(
        uint256 indexed lotId,
        address indexed producer,
        string  variety,
        uint256 quantity
    );

    event StepAdded(
        uint256 indexed lotId,
        StepType indexed stepType,
        address indexed actor,
        uint256 timestamp
    );

    event RoleAssigned(address indexed account, string role);
    event OliPayAddressSet(address indexed oliPay);
    event LotMarkedSold(uint256 indexed lotId);



    modifier onlyOwner() {
        require(msg.sender == owner, "OliveTrace: owner requis");
        _;
    }

    modifier onlyRole(string memory requiredRole) {
        require(
            _hasRole(msg.sender, requiredRole) || _hasRole(msg.sender, "admin"),
            string.concat("OliveTrace: role requis = ", requiredRole)
        );
        _;
    }

    modifier onlyOliPay() {
        require(msg.sender == oliPayAddress, "OliveTrace: appelant non autorise");
        _;
    }

    modifier lotExists(uint256 lotId) {
        require(lotId > 0 && lotId <= _lotCounter, "OliveTrace: lot inexistant");
        _;
    }


    constructor() {
        owner = msg.sender;
        _roles[msg.sender] = "admin";
    }



    /**
     * @notice Assigne un rôle à une adresse.
     * @param  account  Wallet de l'acteur
     * @param  role     "producer" | "mill" | "transport" | "distributor" | "admin"
     */
    function assignRole(address account, string calldata role) external onlyOwner {
        require(account != address(0), "OliveTrace: adresse nulle");
        _validateRole(role);
        _roles[account] = role;
        emit RoleAssigned(account, role);
    }

    /**
     * @notice Définit l'adresse du contrat OliPay (une seule fois ou par le owner).
     */
    function setOliPayAddress(address _oliPay) external onlyOwner {
        require(_oliPay != address(0), "OliveTrace: adresse nulle");
        oliPayAddress = _oliPay;
        emit OliPayAddressSet(_oliPay);
    }



    /**
     * @notice Crée un nouveau lot et enregistre l'étape de récolte.
     * @param  variety      Variété d'olive (ex: "Chemlali")
     * @param  quantity     Quantité en kilogrammes
     * @param  location     Localisation de la parcelle (stockée dans `data`)
     * @param  ipfsHash     CID IPFS des métadonnées JSON du lot
     * @return lotId        Identifiant unique du lot (auto-incrémenté)
     */
    function createLot(
        string calldata variety,
        uint256 quantity,
        string  calldata location,
        string  calldata ipfsHash
    )
        external
        onlyRole("producer")
        returns (uint256 lotId)
    {
        require(bytes(variety).length > 0,  "OliveTrace: variete vide");
        require(quantity > 0,               "OliveTrace: quantite nulle");

        _lotCounter++;
        lotId = _lotCounter;

        _lots[lotId] = Lot({
            id:          lotId,
            producer:    msg.sender,
            variety:     variety,
            harvestDate: block.timestamp,
            quantity:    quantity,
            status:      LotStatus.Created,
            ipfsHash:    ipfsHash
        });

        string memory harvestData = string.concat(
            '{"location":"', location,
            '","variety":"',  variety,
            '","quantity":', _uint2str(quantity), '}'
        );

        _steps[lotId].push(Step({
            stepType:  StepType.Harvest,
            actor:     msg.sender,
            timestamp: block.timestamp,
            data:      harvestData,
            ipfsHash:  ipfsHash
        }));

        _lotsByActor[msg.sender].push(lotId);

        emit LotCreated(lotId, msg.sender, variety, quantity);
        emit StepAdded(lotId, StepType.Harvest, msg.sender, block.timestamp);
    }


    /**
     * @notice Enregistre l'étape de pressage au moulin.
     * @param  lotId        Identifiant du lot
     * @param  outputLiters Litres d'huile produits
     * @param  acidity      Acidité en centièmes (ex: 30 = 0.30%)
     * @param  label        Label qualité ("Extra vierge", "Vierge", etc.)
     * @param  ipfsHash     CID IPFS du certificat d'analyse
     */
    function addMillStep(
        uint256 lotId,
        uint256 outputLiters,
        uint256 acidity,
        string  calldata label,
        string  calldata ipfsHash
    )
        external
        onlyRole("mill")
        lotExists(lotId)
    {
        Lot storage lot = _lots[lotId];
        require(lot.status == LotStatus.Created, "OliveTrace: statut invalide pour pressage");

        string memory millData = string.concat(
            '{"outputLiters":', _uint2str(outputLiters),
            ',"acidity":"',     _acidityStr(acidity),
            '","label":"',      label, '"}'
        );

        _steps[lotId].push(Step({
            stepType:  StepType.Milling,
            actor:     msg.sender,
            timestamp: block.timestamp,
            data:      millData,
            ipfsHash:  ipfsHash
        }));

        lot.status = LotStatus.AtMill;
        _addActorLot(msg.sender, lotId);

        emit StepAdded(lotId, StepType.Milling, msg.sender, block.timestamp);
    }


    /**
     * @notice Enregistre l'étape de transport.
     * @param  lotId        Identifiant du lot
     * @param  destination  Destination (ex: "Tunis, Entrepôt Nord")
     * @param  temperature  Température de transport en °C
     * @param  ipfsHash     CID IPFS du bon de transport
     */
    function addTransportStep(
        uint256 lotId,
        string  calldata destination,
        uint256 temperature,
        string  calldata ipfsHash
    )
        external
        onlyRole("transport")
        lotExists(lotId)
    {
        Lot storage lot = _lots[lotId];
        require(lot.status == LotStatus.AtMill, "OliveTrace: statut invalide pour transport");

        string memory transportData = string.concat(
            '{"destination":"', destination,
            '","temperature":', _uint2str(temperature), '}'
        );

        _steps[lotId].push(Step({
            stepType:  StepType.Transport,
            actor:     msg.sender,
            timestamp: block.timestamp,
            data:      transportData,
            ipfsHash:  ipfsHash
        }));

        lot.status = LotStatus.InTransit;
        _addActorLot(msg.sender, lotId);

        emit StepAdded(lotId, StepType.Transport, msg.sender, block.timestamp);
    }


    /**
     * @notice Enregistre l'étape de distribution / réception.
     * @param  lotId    Identifiant du lot
     * @param  retailer Nom du point de vente
     * @param  ipfsHash CID IPFS du bon de livraison
     */
    function addDistributionStep(
        uint256 lotId,
        string  calldata retailer,
        string  calldata ipfsHash
    )
        external
        onlyRole("distributor")
        lotExists(lotId)
    {
        Lot storage lot = _lots[lotId];
        require(lot.status == LotStatus.InTransit, "OliveTrace: statut invalide pour distribution");

        string memory distData = string.concat(
            '{"retailer":"', retailer, '"}'
        );

        _steps[lotId].push(Step({
            stepType:  StepType.Distribution,
            actor:     msg.sender,
            timestamp: block.timestamp,
            data:      distData,
            ipfsHash:  ipfsHash
        }));

        lot.status = LotStatus.Distributed;
        _addActorLot(msg.sender, lotId);

        emit StepAdded(lotId, StepType.Distribution, msg.sender, block.timestamp);
    }


    /**
     * @notice Marque le lot comme vendu et enregistre l'étape de vente.
     *         Appelable uniquement par le contrat OliPay.
     * @param  lotId     Identifiant du lot
     * @param  pricePaid Prix de vente en wei
     * @param  buyer     Adresse de l'acheteur
     */
    function markAsSold(
        uint256 lotId,
        uint256 pricePaid,
        address buyer
    )
        external
        onlyOliPay
        lotExists(lotId)
    {
        Lot storage lot = _lots[lotId];
        require(lot.status == LotStatus.Distributed, "OliveTrace: lot non distribue");

        string memory saleData = string.concat(
            '{"pricePaid":', _uint2str(pricePaid),
            ',"buyer":"',    _addr2str(buyer), '"}'
        );

        _steps[lotId].push(Step({
            stepType:  StepType.Sale,
            actor:     buyer,
            timestamp: block.timestamp,
            data:      saleData,
            ipfsHash:  ""
        }));

        lot.status = LotStatus.Sold;

        emit StepAdded(lotId, StepType.Sale, buyer, block.timestamp);
        emit LotMarkedSold(lotId);
    }


    function getLot(uint256 lotId)
        external view lotExists(lotId)
        returns (Lot memory)
    {
        return _lots[lotId];
    }

    function getLotSteps(uint256 lotId)
        external view lotExists(lotId)
        returns (Step[] memory)
    {
        return _steps[lotId];
    }

    function getLotsByActor(address actor)
        external view
        returns (uint256[] memory)
    {
        return _lotsByActor[actor];
    }

    function getRole(address account)
        external view
        returns (string memory)
    {
        return _roles[account];
    }

    function totalLots() external view returns (uint256) {
        return _lotCounter;
    }


    function _hasRole(address account, string memory role) internal view returns (bool) {
        return keccak256(bytes(_roles[account])) == keccak256(bytes(role));
    }

    function _validateRole(string calldata role) internal pure {
        bytes32 r = keccak256(bytes(role));
        require(
            r == keccak256(bytes("producer"))    ||
            r == keccak256(bytes("mill"))        ||
            r == keccak256(bytes("transport"))   ||
            r == keccak256(bytes("distributor")) ||
            r == keccak256(bytes("admin")),
            "OliveTrace: role invalide"
        );
    }

    function _addActorLot(address actor, uint256 lotId) internal {
        uint256[] storage arr = _lotsByActor[actor];
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == lotId) return;
        }
        arr.push(lotId);
    }

    function _uint2str(uint256 n) internal pure returns (string memory) {
        if (n == 0) return "0";
        uint256 tmp = n;
        uint256 digits;
        while (tmp != 0) { digits++; tmp /= 10; }
        bytes memory buf = new bytes(digits);
        while (n != 0) { digits--; buf[digits] = bytes1(uint8(48 + n % 10)); n /= 10; }
        return string(buf);
    }

    function _acidityStr(uint256 centiemes) internal pure returns (string memory) {
        uint256 units = centiemes / 100;
        uint256 dec   = centiemes % 100;
        string memory decStr = dec < 10
            ? string.concat("0", _uint2str(dec))
            : _uint2str(dec);
        return string.concat(_uint2str(units), ".", decStr);
    }

    function _addr2str(address a) internal pure returns (string memory) {
        bytes memory data = abi.encodePacked(a);
        bytes memory hex_chars = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = "0"; str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2]     = hex_chars[uint8(data[i] >> 4)];
            str[3 + i * 2]     = hex_chars[uint8(data[i] & 0x0f)];
        }
        return string(str);
    }
}
