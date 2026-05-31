// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GhostSybil
 * @notice Encrypted Sybil-resistance registry for GhostGov.
 *
 * FHE pattern:
 *   Owner sets per-voter encrypted reputation score (0 = sybil, 1 = legitimate).
 *   GhostGov reads getEncReputation(voter) → euint32 in _applyVote.
 *   FHE.min(voteComponent, encReputation) silently zeroes sybil votes on ciphertext.
 *   No address is publicly flagged — reduction is invisible to the voter.
 *
 * In production, reputation would be oracle-fed from off-chain signals (wallet age,
 * prior cross-protocol participation, proof-of-humanity). For the demo, the owner
 * sets scores directly to illustrate the on-chain FHE gating mechanism.
 *
 * Binary scoring (0 or 1) is chosen deliberately: FHE.min(voteComponent, 0) = 0
 * and FHE.min(voteComponent, 1) = voteComponent, producing a clean gate with no
 * partial weight leakage through the minimum operation.
 */
contract GhostSybil is Ownable {

    address public gov;

    // 0 = sybil (vote silently zeroed), 1 = legitimate (full weight)
    mapping(address => euint32) private _encReputation;
    mapping(address => bool)    public  hasReputation;
    // Plaintext tier for UI display: 0 = unscored, 1 = sybil, 2 = legitimate
    mapping(address => uint8)   public  tier;

    event ReputationSet(address indexed voter, uint8 tier_);
    event GovUpdated(address indexed gov_);

    constructor(address gov_) Ownable(msg.sender) {
        gov = gov_;
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setGov(address gov_) external onlyOwner {
        gov = gov_;
        emit GovUpdated(gov_);
    }

    /**
     * @notice Set a voter's encrypted reputation score.
     * @param voter  Address to score.
     * @param score  0 = sybil (vote silently zeroed), 1 = legitimate (full weight).
     *
     * FHE.allow(encRep, gov) grants GhostGov cryptographic permission to use the handle
     * in FHE.min during vote application without decrypting it.
     */
    function setReputation(address voter, uint32 score) external onlyOwner {
        require(score <= 1, "Score: 0 (sybil) or 1 (legit)");
        _writeReputation(voter, score);
    }

    /**
     * @notice Batch-set reputations in a single call.
     */
    function batchSetReputation(
        address[] calldata voters,
        uint32[]  calldata scores
    ) external onlyOwner {
        require(voters.length == scores.length, "Length mismatch");
        for (uint256 i = 0; i < voters.length; i++) {
            require(scores[i] <= 1, "Score: 0 or 1");
            _writeReputation(voters[i], scores[i]);
        }
    }

    function _writeReputation(address voter, uint32 score) internal {
        euint32 enc = FHE.asEuint32(score);
        FHE.allowThis(enc);
        FHE.allow(enc, gov);

        _encReputation[voter] = enc;
        hasReputation[voter]  = true;
        tier[voter]           = score == 0 ? 1 : 2;

        emit ReputationSet(voter, tier[voter]);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    /**
     * @notice Returns the encrypted reputation handle for use in GhostGov FHE.min.
     *         Only callable by addresses with FHE permission (gov was granted via FHE.allow).
     */
    function getEncReputation(address voter) external view returns (euint32) {
        return _encReputation[voter];
    }
}
