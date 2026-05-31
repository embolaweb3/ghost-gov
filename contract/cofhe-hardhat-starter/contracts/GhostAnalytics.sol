// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IGhostGov {
    function getVoteHandles(uint256 proposalId) external view returns (
        euint32 forVotes,
        euint32 againstVotes,
        euint32 abstainVotes,
        bool    resolved
    );
}

contract GhostAnalytics is Ownable {

    IGhostGov public immutable gov;
    uint32    public quorumThreshold; // 0 = quorum disabled

    struct Analytics {
        euint32 encMargin;
        euint32 encTotalVotes;
        bool    computed;
        bool    published;
        uint32  margin;
        uint32  totalVotes;
    }

    struct AnalyticsView {
        uint32 margin;
        uint32 totalVotes;
        bool   quorumMet;
        bool   computed;
        bool   published;
    }

    mapping(uint256 => Analytics) private _analytics;

    event AnalyticsComputed(uint256 indexed proposalId);
    event AnalyticsPublished(uint256 indexed proposalId, uint32 margin, uint32 totalVotes);
    event QuorumThresholdSet(uint32 threshold);

    constructor(address gov_, uint32 quorumThreshold_) Ownable(msg.sender) {
        gov             = IGhostGov(gov_);
        quorumThreshold = quorumThreshold_;
    }

    function setQuorumThreshold(uint32 threshold) external onlyOwner {
        quorumThreshold = threshold;
        emit QuorumThresholdSet(threshold);
    }

    /**
     * @notice Compute FHE analytics on encrypted tallies from GhostGov.
     *
     * This is the cross-contract FHE access control demonstration:
     *   - GhostGov accumulated tallies and called FHE.allow(handle, address(this))
     *   - This contract can now call FHE.sub/add on those foreign handles
     *   - Neither contract ever sees plaintext — only the Fhenix oracle does
     */
    function computeAnalytics(uint256 proposalId) external {
        (euint32 fv, euint32 av, euint32 abv, bool resolved) = gov.getVoteHandles(proposalId);
        require(resolved,                          "Proposal not resolved");
        require(!_analytics[proposalId].computed,  "Already computed");

        Analytics storage a = _analytics[proposalId];

        a.encMargin     = FHE.sub(fv, av);
        a.encTotalVotes = FHE.add(FHE.add(fv, av), abv);

        FHE.allowThis(a.encMargin);
        FHE.allowThis(a.encTotalVotes);
        FHE.allowPublic(a.encMargin);
        FHE.allowPublic(a.encTotalVotes);

        a.computed = true;
        emit AnalyticsComputed(proposalId);
    }

    /**
     * @notice Oracle publishes verifiable plaintext analytics.
     * Margin wraps on underflow — value > 2^31 means AGAINST leads.
     */
    function publishAnalytics(
        uint256      proposalId,
        uint32       marginPlain,
        bytes memory marginSig,
        uint32       totalPlain,
        bytes memory totalSig
    ) external {
        Analytics storage a = _analytics[proposalId];
        require(a.computed,   "Analytics not computed");
        require(!a.published, "Already published");

        FHE.publishDecryptResult(a.encMargin,     marginPlain, marginSig);
        FHE.publishDecryptResult(a.encTotalVotes, totalPlain,  totalSig);

        a.margin     = marginPlain;
        a.totalVotes = totalPlain;
        a.published  = true;
        emit AnalyticsPublished(proposalId, marginPlain, totalPlain);
    }

    //  Quorum gate 

    /**
     * @notice Called by GhostGov.publishResults() — results only land if quorum met.
     * Returns true if threshold == 0 (disabled) or totalVotes >= threshold.
     */
    function isQuorumMet(uint256 proposalId) external view returns (bool) {
        if (quorumThreshold == 0) return true;
        Analytics storage a = _analytics[proposalId];
        if (!a.published) return false;
        return a.totalVotes >= quorumThreshold;
    }

    //  Views

    function getAnalytics(uint256 proposalId) external view returns (AnalyticsView memory v) {
        Analytics storage a = _analytics[proposalId];
        bool quorumMet_ = quorumThreshold == 0
            ? true
            : (a.published && a.totalVotes >= quorumThreshold);

        v = AnalyticsView({
            margin:     a.margin,
            totalVotes: a.totalVotes,
            quorumMet:  quorumMet_,
            computed:   a.computed,
            published:  a.published
        });
    }
}
