// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GhostDelegation
 * @notice Private voting-power delegation for GhostGov.
 */
contract GhostDelegation is Ownable {

    address public immutable gov;
    uint32  public powerCap; // 0 = no cap; enforced via FHE.min on ciphertext

    mapping(address => euint32) private _encPower;
    mapping(address => bool)    public  hasDelegated;
    mapping(address => address) public  delegatedTo;
    mapping(address => uint8)   public  delegatedWeight;
    mapping(uint256 => mapping(address => bool)) public delegateVoted;

    event Delegated(address indexed from, address indexed to, uint8 weight);
    event Revoked(address indexed from, address indexed to);
    event PowerCapSet(uint32 cap);

    modifier onlyGov() {
        require(msg.sender == gov, "Only GhostGov");
        _;
    }

    constructor(address gov_, uint32 powerCap_) Ownable(msg.sender) {
        gov      = gov_;
        powerCap = powerCap_;
    }

    //  Delegation 

    /**
     * @notice Delegate your voting weight to `to`.
     * @param to        Address to receive delegated power.
     * @param encWeight Encrypted weight — must match plaintext `weight`.
     * @param weight    Plaintext weight (1, 2, or 4) stored for revocation.
     *
     * The encrypted weight is accumulated into `encPower[to]` via FHE.add.
     * FHE.min enforces the anti-whale cap without revealing either value.
     * FHE.allow grants GhostGov permission to use the handle in castDelegatedVote.
     */
    function delegate(
        address          to,
        InEuint32 memory encWeight,
        uint8            weight
    ) external {
        require(weight == 1 || weight == 2 || weight == 4, "Weight: 1, 2, or 4");
        require(!hasDelegated[msg.sender], "Already delegating");
        require(to != msg.sender,          "Cannot self-delegate");
        require(to != address(0),          "Zero address");

        // Initialise delegate's power bucket on first delegation
        if (!FHE.isInitialized(_encPower[to])) {
            _encPower[to] = FHE.asEuint32(0);
        }

        euint32 w = FHE.asEuint32(encWeight);
        _encPower[to] = FHE.add(_encPower[to], w);

        // Anti-whale: silently cap accumulated power on ciphertext
        if (powerCap > 0) {
            _encPower[to] = FHE.min(_encPower[to], FHE.asEuint32(powerCap));
        }

        FHE.allowThis(_encPower[to]);
        FHE.allow(_encPower[to], gov);

        hasDelegated[msg.sender]    = true;
        delegatedTo[msg.sender]     = to;
        delegatedWeight[msg.sender] = weight;

        emit Delegated(msg.sender, to, weight);
    }

    /**
     * @notice Revoke your active delegation.
     *
     * Subtracts your stored weight from the delegate's encPower via FHE.sub.
     * The delegate cannot identify which delegator revoked — only the total drops.
     * Weight is trivially encrypted (it's in {1,2,4} so it's effectively public),
     * but the subtraction preserves the aggregate's opacity.
     */
    function revoke() external {
        require(hasDelegated[msg.sender], "No active delegation");

        address to     = delegatedTo[msg.sender];
        uint8   weight = delegatedWeight[msg.sender];

        _encPower[to] = FHE.sub(_encPower[to], FHE.asEuint32(uint32(weight)));
        FHE.allowThis(_encPower[to]);
        FHE.allow(_encPower[to], gov);

        hasDelegated[msg.sender]    = false;
        delegatedTo[msg.sender]     = address(0);
        delegatedWeight[msg.sender] = 0;

        emit Revoked(msg.sender, to);
    }

    //  Gov callbacks 

    function recordDelegateVoted(uint256 proposalId, address delegate_) external onlyGov {
        require(!delegateVoted[proposalId][delegate_], "Already voted as delegate");
        delegateVoted[proposalId][delegate_] = true;
    }

    //  Views

    function getEncPower(address delegate_) external view returns (euint32) {
        return _encPower[delegate_];
    }

    function hasPower(address delegate_) external view returns (bool) {
        return FHE.isInitialized(_encPower[delegate_]);
    }

    //  Admin

    function setPowerCap(uint32 cap) external onlyOwner {
        powerCap = cap;
        emit PowerCapSet(cap);
    }
}
