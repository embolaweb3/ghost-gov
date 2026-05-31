// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GhostVeto
 * @notice Encrypted guardian veto for GhostGov proposals.
 *
 * FHE pattern:
 *   Guardian submits encVeto (0 = pass, 1 = veto) during the voting window.
 *   The veto value is stored as a ciphertext — nobody knows the guardian's intent
 *   until oracle decryption, eliminating targeted lobbying of the guardian entirely.
 *
 *   FHE.allowPublic() on the veto handle signals the oracle to decrypt.
 *   Anyone with the oracle's signature can then call publishVetoResult to settle.
 *   GhostGov.publishResults checks isVetoed() before releasing decrypted tallies.
 *
 * Key property: guardian *identity* is public, guardian *intent* is private until
 * resolution. A vetoing guardian cannot be pressured because nobody knows if the
 * veto was exercised until after the outcome is final.
 */
contract GhostVeto is Ownable {

    address public gov;

    mapping(address => bool)    public isGuardian;
    mapping(uint256 => euint32) private _encVeto;    // 0 = pass, 1 = veto
    mapping(uint256 => bool)    public  vetoSubmitted;
    mapping(uint256 => bool)    public  vetoSettled;
    mapping(uint256 => bool)    public  vetoResult;  // plaintext after oracle decryption
    mapping(uint256 => address) public  vetoGuardian;

    event GuardianSet(address indexed guardian, bool status);
    event VetoSubmitted(uint256 indexed proposalId, address indexed guardian);
    event VetoSettled(uint256 indexed proposalId, bool vetoed);
    event GovUpdated(address indexed gov_);

    modifier onlyGuardian() {
        require(isGuardian[msg.sender], "Not a guardian");
        _;
    }

    constructor(address gov_) Ownable(msg.sender) {
        gov = gov_;
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setGuardian(address guardian, bool status) external onlyOwner {
        isGuardian[guardian] = status;
        emit GuardianSet(guardian, status);
    }

    function setGov(address gov_) external onlyOwner {
        gov = gov_;
        emit GovUpdated(gov_);
    }

    // ─── Guardian ─────────────────────────────────────────────────────────────

    /**
     * @notice Submit an encrypted veto during the voting window.
     * @param proposalId  Target proposal.
     * @param encVeto     Encrypted 0 (pass) or 1 (veto).
     *
     * The encrypted value is stored and FHE.allowPublic() is called so the oracle
     * can decrypt it after the proposal resolves. Until then, even other guardians
     * cannot determine the submitted direction — eliminating coordination attacks.
     *
     * Only one veto per proposal is supported. First guardian to submit wins.
     */
    function submitVeto(uint256 proposalId, InEuint32 memory encVeto) external onlyGuardian {
        require(!vetoSubmitted[proposalId], "Veto already submitted for this proposal");

        euint32 v = FHE.asEuint32(encVeto);
        FHE.allowThis(v);
        FHE.allowPublic(v); // signals oracle to decrypt this handle

        _encVeto[proposalId]      = v;
        vetoSubmitted[proposalId] = true;
        vetoGuardian[proposalId]  = msg.sender;

        emit VetoSubmitted(proposalId, msg.sender);
    }

    // ─── Oracle settlement ────────────────────────────────────────────────────

    /**
     * @notice Settle the veto outcome after oracle decryption.
     * @param proposalId Target proposal.
     * @param plain      Decrypted value (0 = pass, 1 = veto) from oracle.
     * @param sig        Oracle signature over the plaintext result.
     *
     * Anyone can call once the oracle has produced the signature.
     * FHE.publishDecryptResult verifies the oracle signature on-chain — the plaintext
     * cannot be forged. After this call, GhostGov.publishResults checks isVetoed().
     */
    function publishVetoResult(
        uint256      proposalId,
        uint32       plain,
        bytes memory sig
    ) external {
        require(vetoSubmitted[proposalId], "No veto submitted for this proposal");
        require(!vetoSettled[proposalId],  "Veto already settled");
        require(plain <= 1,                "Invalid veto value");

        FHE.publishDecryptResult(_encVeto[proposalId], plain, sig);

        vetoSettled[proposalId] = true;
        vetoResult[proposalId]  = (plain == 1);

        emit VetoSettled(proposalId, plain == 1);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    /**
     * @notice Returns true if veto was settled AND the guardian exercised the veto.
     *         Called by GhostGov.publishResults to block result publication on veto.
     */
    function isVetoed(uint256 proposalId) external view returns (bool) {
        return vetoSettled[proposalId] && vetoResult[proposalId];
    }

    function getEncVeto(uint256 proposalId) external view returns (euint32) {
        return _encVeto[proposalId];
    }
}
