// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GhostVoter
 * @notice Soulbound participation NFT for GhostGov voters.
 *
 * Minted automatically on a wallet's first vote (regular or delegated).
 * Non-transferable: proves governance participation without revealing vote direction.
 * "Whale Watcher" trait unlocks at WHALE_THRESHOLD votes — rewards sustained engagement.
 *
 * On-chain metadata: tokenURI returns JSON with vote count and whale status.
 */
contract GhostVoter is ERC721, Ownable {

    uint256 public constant WHALE_THRESHOLD = 3;

    uint256 private _nextTokenId;
    address public  gov;

    mapping(address => uint256) public voterToken;  // 0 = no token minted
    mapping(uint256 => uint256) public voteCount;

    event VoterMinted(address indexed voter, uint256 indexed tokenId);
    event VoteRecorded(address indexed voter, uint256 indexed tokenId, uint256 count);
    event GovSet(address indexed gov_);

    modifier onlyGov() {
        require(msg.sender == gov, "Only GhostGov");
        _;
    }

    constructor(address gov_) ERC721("GhostVoter", "GHOST") Ownable(msg.sender) {
        gov = gov_;
    }

    //  Soulbound 

    // OZ v5: override _update to block all transfers after mint
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0), "GhostVoter: soulbound");
        return super._update(to, tokenId, auth);
    }

    //  Gov callbacks

    /**
     * @notice Called by GhostGov on every vote. Mints on first call, increments count thereafter.
     */
    function mintIfNew(address voter) external onlyGov {
        if (voterToken[voter] == 0) {
            _nextTokenId++;
            uint256 tokenId = _nextTokenId;
            _mint(voter, tokenId);
            voterToken[voter]  = tokenId;
            voteCount[tokenId] = 1;
            emit VoterMinted(voter, tokenId);
        } else {
            uint256 tokenId = voterToken[voter];
            voteCount[tokenId]++;
            emit VoteRecorded(voter, tokenId, voteCount[tokenId]);
        }
    }

    //  Views

    function hasVoterNFT(address voter) external view returns (bool) {
        return voterToken[voter] != 0;
    }

    function isWhaleWatcher(address voter) external view returns (bool) {
        uint256 tokenId = voterToken[voter];
        if (tokenId == 0) return false;
        return voteCount[tokenId] >= WHALE_THRESHOLD;
    }

    function getVoterInfo(address voter) external view returns (
        uint256 tokenId,
        uint256 votes,
        bool    whaleWatcher
    ) {
        tokenId = voterToken[voter];
        if (tokenId == 0) return (0, 0, false);
        votes        = voteCount[tokenId];
        whaleWatcher = votes >= WHALE_THRESHOLD;
    }

    //  Metadata

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        uint256 votes = voteCount[tokenId];
        bool    whale = votes >= WHALE_THRESHOLD;
        return string(abi.encodePacked(
            'data:application/json;utf8,{"name":"GhostVoter #',
            _toString(tokenId),
            '","description":"Proof of participation in GhostGov - coercion-resistant FHE governance. Vote direction is permanently encrypted.","attributes":[{"trait_type":"Votes Cast","value":',
            _toString(votes),
            '},{"trait_type":"Whale Watcher","value":"',
            whale ? "true" : "false",
            '"}]}'
        ));
    }

    //  Admin

    function setGov(address gov_) external onlyOwner {
        gov = gov_;
        emit GovSet(gov_);
    }

    //  Internal

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp   = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buf = new bytes(digits);
        while (value != 0) { digits--; buf[digits] = bytes1(uint8(48 + value % 10)); value /= 10; }
        return string(buf);
    }
}
