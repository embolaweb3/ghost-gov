// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IGhostGovForBribe {
    function hasVoted(uint256 proposalId, address voter) external view returns (bool);
}

/**
 * @title GhostBribe
 * @notice Demonstrates that vote-buying is structurally impossible under FHE
 */
contract GhostBribe is Ownable {

    address public immutable gov;

    struct Bribe {
        uint256 proposalId;
        uint8   targetDirection; // 0=FOR 1=AGAINST 2=ABSTAIN — public target, private compliance
        uint256 totalFunds;
        address briber;
        bool    active;
        uint256 claimCount;
    }

    struct ClaimAttempt {
        address claimer;
        euint32 encSubmittedDir; // encrypted direction submitted by claimer
        uint256 timestamp;
    }

    uint256 public bribeCount;
    mapping(uint256 => Bribe)          public  bribes;
    mapping(uint256 => ClaimAttempt[]) private _claims;

    event BribeCreated(uint256 indexed bribeId, uint256 indexed proposalId, uint8 direction, uint256 amount, address indexed briber);
    event ClaimAttempted(uint256 indexed bribeId, address indexed claimer, uint256 claimIndex);
    event BribeCancelled(uint256 indexed bribeId, uint256 amountReturned);

    constructor(address gov_) Ownable(msg.sender) {
        gov = gov_;
    }

    //  Briber 

    /**
     * @notice Lock ETH as a bribe for voters who claim to vote a specific direction.
     * @param proposalId Target proposal.
     * @param direction  0=FOR, 1=AGAINST, 2=ABSTAIN. Publicly visible — compliance is not.
     */
    function createBribe(uint256 proposalId, uint8 direction) external payable {
        require(msg.value > 0,   "No funds deposited");
        require(direction <= 2,  "Invalid direction");

        uint256 id = bribeCount++;
        bribes[id] = Bribe({
            proposalId:      proposalId,
            targetDirection: direction,
            totalFunds:      msg.value,
            briber:          msg.sender,
            active:          true,
            claimCount:      0
        });

        emit BribeCreated(id, proposalId, direction, msg.value, msg.sender);
    }

    /**
     * @notice Cancel bribe and recover funds. Only explicit cancellation works —
     *         settlement via FHE.eq verification is permanently impossible.
     */
    function cancelBribe(uint256 bribeId) external {
        Bribe storage b = bribes[bribeId];
        require(msg.sender == b.briber, "Not briber");
        require(b.active,               "Already cancelled");

        b.active     = false;
        uint256 amount = b.totalFunds;
        b.totalFunds = 0;

        (bool ok,) = payable(msg.sender).call{value: amount}("");
        require(ok, "Transfer failed");
        emit BribeCancelled(bribeId, amount);
    }

    //  Voter ─

    /**
     * @notice Submit an encrypted vote direction to claim a bribe.
     *
     * FHE.eq(submittedDir, targetDir) produces an encrypted boolean that CANNOT be
     * unwrapped in this transaction. There is no synchronous payout path — settlement
     * is provably impossible without oracle decryption, which this contract never requests.
     *
     * The claimer's submitted direction is stored as a ciphertext, unreadable to the briber.
     * Even if the claimer voted correctly, the bribe cannot pay out. Vote-buying fails.
     *
     * @param bribeId Bribe to claim against.
     * @param encDir  Encrypted vote direction (0=FOR, 1=AGAINST, 2=ABSTAIN).
     */
    function attemptClaim(uint256 bribeId, InEuint32 memory encDir) external {
        Bribe storage b = bribes[bribeId];
        require(b.active, "Bribe not active");
        require(
            IGhostGovForBribe(gov).hasVoted(b.proposalId, msg.sender),
            "Must have voted on this proposal"
        );

        euint32 submittedDir = FHE.asEuint32(encDir);
        FHE.allowThis(submittedDir);

        // FHE.eq produces an encrypted boolean — unreadable without oracle decryption.
        // Result deliberately not stored: no synchronous payout path exists. Funds locked.
        FHE.eq(submittedDir, FHE.asEuint32(uint32(b.targetDirection)));

        uint256 idx = _claims[bribeId].length;
        _claims[bribeId].push(ClaimAttempt({
            claimer:         msg.sender,
            encSubmittedDir: submittedDir,
            timestamp:       block.timestamp
        }));

        b.claimCount++;
        emit ClaimAttempted(bribeId, msg.sender, idx);
        // No ETH transferred. Settlement requires oracle decryption — permanently blocked.
    }

    //  Views 

    function getClaimCount(uint256 bribeId) external view returns (uint256) {
        return _claims[bribeId].length;
    }

    function getClaim(uint256 bribeId, uint256 idx) external view returns (
        address claimer,
        uint256 timestamp
    ) {
        ClaimAttempt storage c = _claims[bribeId][idx];
        return (c.claimer, c.timestamp);
    }

    function getBribe(uint256 bribeId) external view returns (
        uint256 proposalId,
        uint8   direction,
        uint256 totalFunds,
        address briber,
        bool    active,
        uint256 claimCount
    ) {
        Bribe storage b = bribes[bribeId];
        return (b.proposalId, b.targetDirection, b.totalFunds, b.briber, b.active, b.claimCount);
    }
}
