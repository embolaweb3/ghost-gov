// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// ─ Interfaces ─

interface IGhostAnalytics {
    struct AnalyticsView {
        uint32 margin;
        uint32 totalVotes;
        bool   quorumMet;
        bool   computed;
        bool   published;
    }
    function getAnalytics(uint256 proposalId) external view returns (AnalyticsView memory);
    function isQuorumMet(uint256 proposalId) external view returns (bool);
}

interface IGhostTreasury {
    function deposit(uint256 proposalId) external payable;
}

contract GhostGov is Ownable {

    uint256 public constant BASE_COST = 0.0001 ether;

    IGhostAnalytics public analyticsEngine;
    IGhostTreasury  public treasury;

    struct Proposal {
        uint256 id;
        string  title;
        string  description;
        string  category;
        address proposer;
        uint256 startTime;
        uint256 endTime;
        euint32 forVotes;
        euint32 againstVotes;
        euint32 abstainVotes;
        bool    resolved;
        bool    resultsPublished;
    }

    struct ProposalView {
        uint256 id;
        string  title;
        string  description;
        string  category;
        address proposer;
        uint256 startTime;
        uint256 endTime;
        uint256 voterCount;
        bool    resolved;
        bool    resultsPublished;
        bool    analyticsPublished;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        uint256 margin;
        uint256 totalVotes;
        bool    resultsReady;
        bool    analyticsReady;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal)                  private proposals;
    mapping(uint256 => mapping(address => bool))  public  hasVoted;
    mapping(uint256 => mapping(address => uint8)) public  voteWeight;
    mapping(uint256 => uint256)                   public  voterCount;

    uint256 public minVotingDuration = 60;
    uint256 public maxVotingDuration = 30 days;

    event ProposalCreated(uint256 indexed id, address indexed proposer, string title, string category, uint256 endTime);
    event VoteCast(uint256 indexed proposalId, address indexed voter);
    event WeightedVoteCast(uint256 indexed proposalId, address indexed voter, uint8 weight);
    event ProposalResolved(uint256 indexed proposalId);
    event ResultsPublished(uint256 indexed proposalId, uint32 forVotes, uint32 againstVotes, uint32 abstainVotes);
    event AnalyticsEngineSet(address indexed engine);
    event TreasurySet(address indexed treasury_);

    constructor() Ownable(msg.sender) {}

    // ─ Admin 

    function setAnalyticsEngine(address engine) external onlyOwner {
        analyticsEngine = IGhostAnalytics(engine);
        emit AnalyticsEngineSet(engine);
    }

    function setTreasury(address treasury_) external onlyOwner {
        treasury = IGhostTreasury(treasury_);
        emit TreasurySet(treasury_);
    }

    function setVotingDurationBounds(uint256 min_, uint256 max_) external onlyOwner {
        require(min_ > 0 && max_ >= min_, "Invalid bounds");
        minVotingDuration = min_;
        maxVotingDuration = max_;
    }

    // ─ Proposal lifecycle ─

    function createProposal(
        string calldata title,
        string calldata description,
        string calldata category,
        uint256         durationSeconds
    ) external returns (uint256 id) {
        require(bytes(title).length > 0, "Empty title");
        require(
            durationSeconds >= minVotingDuration &&
            durationSeconds <= maxVotingDuration,
            "Invalid duration"
        );

        id = proposalCount++;
        Proposal storage p = proposals[id];
        p.id           = id;
        p.title        = title;
        p.description  = description;
        p.category     = category;
        p.proposer     = msg.sender;
        p.startTime    = block.timestamp;
        p.endTime      = block.timestamp + durationSeconds;
        p.forVotes     = FHE.asEuint32(0);
        p.againstVotes = FHE.asEuint32(0);
        p.abstainVotes = FHE.asEuint32(0);

        FHE.allowThis(p.forVotes);
        FHE.allowThis(p.againstVotes);
        FHE.allowThis(p.abstainVotes);

        emit ProposalCreated(id, msg.sender, title, category, p.endTime);
    }

    // ─ Voting ─

    function castVote(
        uint256          proposalId,
        InEuint32 memory encFor,
        InEuint32 memory encAgainst,
        InEuint32 memory encAbstain
    ) external {
        _applyVote(proposalId, encFor, encAgainst, encAbstain);
        voteWeight[proposalId][msg.sender] = 1;
        emit VoteCast(proposalId, msg.sender);
    }

    function castWeightedVote(
        uint256          proposalId,
        InEuint32 memory encFor,
        InEuint32 memory encAgainst,
        InEuint32 memory encAbstain,
        uint8            weight
    ) external payable {
        require(weight == 1 || weight == 2 || weight == 4, "Weight: 1, 2 or 4");
        uint256 cost = uint256(weight) * uint256(weight) * BASE_COST;
        require(msg.value == cost, "Incorrect payment for weight");

        _applyVote(proposalId, encFor, encAgainst, encAbstain);
        voteWeight[proposalId][msg.sender] = weight;

        if (address(treasury) != address(0)) {
            treasury.deposit{value: msg.value}(proposalId);
        }

        emit WeightedVoteCast(proposalId, msg.sender, weight);
    }

    function _applyVote(
        uint256          proposalId,
        InEuint32 memory encFor,
        InEuint32 memory encAgainst,
        InEuint32 memory encAbstain
    ) internal {
        Proposal storage p = proposals[proposalId];
        require(block.timestamp >= p.startTime, "Not started");
        require(block.timestamp <  p.endTime,   "Voting ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted");

        p.forVotes     = FHE.add(p.forVotes,     FHE.asEuint32(encFor));
        p.againstVotes = FHE.add(p.againstVotes, FHE.asEuint32(encAgainst));
        p.abstainVotes = FHE.add(p.abstainVotes, FHE.asEuint32(encAbstain));

        FHE.allowThis(p.forVotes);
        FHE.allowThis(p.againstVotes);
        FHE.allowThis(p.abstainVotes);

        hasVoted[proposalId][msg.sender] = true;
        voterCount[proposalId]++;
    }

    // ─ Resolution ─

    /**
     * @notice Close voting and grant GhostAnalytics cryptographic access to tallies.
     *
     * The FHE.allow() calls are the key primitive: a separately deployed analytics
     * contract receives permission to run FHE.sub/add on encrypted handles it
     * never created — cross-contract FHE access control.
     */
    function resolveProposal(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        require(block.timestamp >= p.endTime, "Voting still active");
        require(!p.resolved,                  "Already resolved");

        p.resolved = true;

        FHE.allowPublic(p.forVotes);
        FHE.allowPublic(p.againstVotes);
        FHE.allowPublic(p.abstainVotes);

        if (address(analyticsEngine) != address(0)) {
            FHE.allow(p.forVotes,     address(analyticsEngine));
            FHE.allow(p.againstVotes, address(analyticsEngine));
            FHE.allow(p.abstainVotes, address(analyticsEngine));
        }

        emit ProposalResolved(proposalId);
    }

    function publishResults(
        uint256      proposalId,
        uint32       forPlain,
        bytes memory forSig,
        uint32       againstPlain,
        bytes memory againstSig,
        uint32       abstainPlain,
        bytes memory abstainSig
    ) external {
        Proposal storage p = proposals[proposalId];
        require(p.resolved,          "Not resolved yet");
        require(!p.resultsPublished, "Already published");

        if (address(analyticsEngine) != address(0)) {
            require(analyticsEngine.isQuorumMet(proposalId), "Quorum not met");
        }

        FHE.publishDecryptResult(p.forVotes,     forPlain,     forSig);
        FHE.publishDecryptResult(p.againstVotes, againstPlain, againstSig);
        FHE.publishDecryptResult(p.abstainVotes, abstainPlain, abstainSig);

        p.resultsPublished = true;
        emit ResultsPublished(proposalId, forPlain, againstPlain, abstainPlain);
    }

    // ─ FHE handle passthrough ─

    function getVoteHandles(uint256 proposalId) external view returns (
        euint32 forVotes,
        euint32 againstVotes,
        euint32 abstainVotes,
        bool    resolved
    ) {
        Proposal storage p = proposals[proposalId];
        return (p.forVotes, p.againstVotes, p.abstainVotes, p.resolved);
    }

    // ─ Views 

    function getProposal(uint256 id) external view returns (ProposalView memory v) {
        Proposal storage p = proposals[id];
        (uint256 fv,  bool fReady)  = FHE.getDecryptResultSafe(p.forVotes);
        (uint256 av,  bool aReady)  = FHE.getDecryptResultSafe(p.againstVotes);
        (uint256 abv, bool abReady) = FHE.getDecryptResultSafe(p.abstainVotes);

        IGhostAnalytics.AnalyticsView memory analytics;
        if (address(analyticsEngine) != address(0)) {
            analytics = analyticsEngine.getAnalytics(id);
        }

        v = ProposalView({
            id:                 p.id,
            title:              p.title,
            description:        p.description,
            category:           p.category,
            proposer:           p.proposer,
            startTime:          p.startTime,
            endTime:            p.endTime,
            voterCount:         voterCount[id],
            resolved:           p.resolved,
            resultsPublished:   p.resultsPublished,
            analyticsPublished: analytics.published,
            forVotes:           fv,
            againstVotes:       av,
            abstainVotes:       abv,
            margin:             analytics.margin,
            totalVotes:         analytics.totalVotes,
            resultsReady:       fReady && aReady && abReady,
            analyticsReady:     analytics.published
        });
    }

    function getProposals(
        uint256 offset,
        uint256 limit
    ) external view returns (ProposalView[] memory result) {
        uint256 total = proposalCount;
        if (offset >= total) return result;
        uint256 end = offset + limit > total ? total : offset + limit;
        result = new ProposalView[](end - offset);
        for (uint256 i = 0; i < result.length; i++) {
            result[i] = this.getProposal(offset + i);
        }
    }
}
