// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract NFTMarketplace is AccessControl, ERC721URIStorage {
    using Counters for Counters.Counter;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");
    bytes32 public constant SELLER_ROLE = keccak256("SELLER_ROLE");
    bytes32 public constant BUYER_ROLE = keccak256("BUYER_ROLE");

    struct ListedToken {
        uint256 tokenId;
        address payable owner;
        address payable creator;
        uint256 price;
        bool isListed;
    }

    Counters.Counter private _tokenIdCounter;
    address payable public owner;
    uint256 listPrice = 0.001 ether;
    mapping(uint256 => uint256) public nftPrices; // Token ID => Price
    mapping(address => uint256) public balances; // Seller address => Balance
    mapping(uint256 => ListedToken) private idToListedToken;
    
    event TokenListedSuccess(
        uint256 indexed id,
        address indexed owner,
        address indexed creator,
        uint256 price,
        bool isListed
    );
    event NFTPriceSet(uint256 indexed tokenId, uint256 price);
    event NFTSold(uint256 indexed tokenId, address indexed buyer, uint256 price);


    constructor() ERC721("NFTMarketplace", "NFTM"){
        owner = payable(msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
    }

    function createToken(string memory tokenURI, uint256 price) public payable onlyRole(CREATOR_ROLE) returns (uint256) {
        require(hasRole(CREATOR_ROLE, msg.sender), "NFTMarketplace: Caller is not a creator");
        _tokenIdCounter.increment();
        uint256 newTokenId = _tokenIdCounter.current();
        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        return newTokenId;
    }

    function listNFT(uint256 _tokenId, uint256 _price) external onlyRole(BUYER_ROLE) {
        require(hasRole(BUYER_ROLE, msg.sender), "NFTMarketplace: Caller is not a seller");
        require(_exists(_tokenId), "NFTMarketplace: Token ID does not exist");
        require(nftPrices[_tokenId] > 0, "NFTMarketplace: NFT already listed");
        nftPrices[_tokenId] = _price;
        idToListedToken[_tokenId].price = _price;
        idToListedToken[_tokenId].isListed = true;
        emit TokenListedSuccess(
            _tokenId,
            ownerOf(_tokenId),
            idToListedToken[_tokenId].creator,
            _price,
            true
        );
    }

    function setPrice(uint256 _tokenId, uint256 _price) external onlyRole(SELLER_ROLE) {
        require(hasRole(SELLER_ROLE, msg.sender), "NFTMarketplace: Caller is not a seller");
        require(_exists(_tokenId), "NFTMarketplace: Token ID does not exist");
        nftPrices[_tokenId] = _price;
        emit NFTPriceSet(_tokenId, _price);
    }

    function buyNFT(uint256 _tokenId) external payable onlyRole(BUYER_ROLE) {
    require(_exists(_tokenId), "NFTMarketplace: Token ID does not exist");
    require(nftPrices[_tokenId] > 0, "NFTMarketplace: NFT not for sale");
    require(msg.value >= nftPrices[_tokenId], "NFTMarketplace: Insufficient funds");

    address seller = ownerOf(_tokenId);
    uint256 price = nftPrices[_tokenId];
    uint256 contractFee = price * 5 / 100;
    uint256 sellerProceeds = price - contractFee;

    balances[seller] += sellerProceeds;
    balances[address(this)] += contractFee;

    payable(seller).transfer(sellerProceeds);
    emit NFTSold(_tokenId, msg.sender, price);
    }


    function withdraw() external onlyRole(ADMIN_ROLE) {
        require(hasRole(ADMIN_ROLE, msg.sender), "NFTMarketplace: Caller is not an admin");
        require(balances[msg.sender] > 0, "NFTMarketplace: No balance to withdraw");
        uint256 amount = balances[msg.sender];
        balances[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    function assignRole(address _address, bytes32 _role) external onlyRole(ADMIN_ROLE) {
        grantRole(_role, _address);
    }

    function revokeRole(address _address, bytes32 _role) external onlyRole(ADMIN_ROLE) {
        revokeRole(_role, _address);
    }

    function getTokenURI(uint256 _tokenId) external view returns (string memory) {
        return tokenURI(_tokenId);
    }

    function getAllNfts() public view returns (ListedToken[] memory) {
        uint256 totalListedTokens = _tokenIdCounter.current();
        ListedToken[] memory listedTokens = new ListedToken[](totalListedTokens);
        for (uint256 i = 0; i < totalListedTokens; i++) {
            listedTokens[i] = idToListedToken[i];
        }
        return listedTokens;
    }

    function getMyNfts() public view returns (ListedToken[] memory) {
        uint256 totalListedTokens = _tokenIdCounter.current();
        ListedToken[] memory listedTokens = new ListedToken[](totalListedTokens);
        for (uint256 i = 0; i < totalListedTokens; i++) {
            if (idToListedToken[i].owner == msg.sender) {
                listedTokens[i] = idToListedToken[i];
            }
        }
        return listedTokens;
    }

    function sellNfts(uint256 _tokenId) public payable{
        require(idToListedToken[_tokenId].isListed, "NFTMarketplace: NFT not listed");
        require(hasRole(SELLER_ROLE, msg.sender), "NFTMarketplace: Caller is not a seller");
        require(msg.value >= idToListedToken[_tokenId].price, "NFTMarketplace: Insufficient funds");
        address seller = idToListedToken[_tokenId].owner;
        uint price = idToListedToken[_tokenId].price;

        idToListedToken[_tokenId].owner = payable(msg.sender);

        _transfer(address(this), msg.sender, _tokenId);
        _approve(msg.sender, _tokenId);

        balances[seller] += msg.value * 95 / 100;
        balances[address(this)] += msg.value * 5 / 100;

        payable(seller).transfer(msg.value * 95 / 100);
        payable(owner).transfer(msg.value * 5 / 100);

        emit NFTSold(_tokenId, msg.sender, price);
        
    } 
}
