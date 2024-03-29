// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract NFTMarketplace is AccessControl, ERC721URIStorage, ReentrancyGuard {
    using Counters for Counters.Counter;
    using SafeMath for uint256;

    bytes32 public constant ADMIN_ROLE = keccak256(abi.encodePacked("ADMIN_ROLE"));
    bytes32 public constant CREATOR_ROLE = keccak256(abi.encodePacked("CREATOR_ROLE"));
    bytes32 public constant SELLER_ROLE = keccak256(abi.encodePacked("SELLER_ROLE"));
    bytes32 public constant BUYER_ROLE = keccak256(abi.encodePacked("BUYER_ROLE"));


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
    uint256 public constant CONTRACT_FEE_PERCENT = 5;
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
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

    }

    modifier onlyRoleCustom(bytes32 role) {
        require(hasRole(role, msg.sender), "NFTMarketplace: Caller is not in the required role");
        _;
    }

    function createAndListToken(string memory tokenURI, uint256 price) public payable onlyRole(CREATOR_ROLE) returns (uint256) {
    _tokenIdCounter.increment();
    uint256 newTokenId = _tokenIdCounter.current();
    _safeMint(msg.sender, newTokenId);
    _setTokenURI(newTokenId, tokenURI);

    // List the token for sale
    address tokenOwner = ownerOf(newTokenId);
    require(tokenOwner != address(0), "NFTMarketplace: Token ID does not exist");

    nftPrices[newTokenId] = price;
    idToListedToken[newTokenId] = ListedToken({
        tokenId: newTokenId,
        owner: payable(msg.sender),
        creator: payable(ownerOf(newTokenId)),
        price: price,
        isListed: true
    });
    emit TokenListedSuccess(
        newTokenId,
        ownerOf(newTokenId),
        idToListedToken[newTokenId].creator,
        price,
        true
    );

    return newTokenId;
    }
    function setPrice(uint256 _tokenId, uint256 _price) external onlyRole(SELLER_ROLE) {
        address tokenOwner = ownerOf(_tokenId);
        require(tokenOwner != address(0), "NFTMarketplace: Token ID does not exist");
        nftPrices[_tokenId] = _price;
        emit NFTPriceSet(_tokenId, _price);
    }

    function buyNFT(uint256 _tokenId) external payable onlyRole(BUYER_ROLE) nonReentrant {
        require(nftPrices[_tokenId] > 0, "NFTMarketplace: NFT not for sale");
        require(msg.value >= nftPrices[_tokenId], "NFTMarketplace: Insufficient funds");

        address seller = ownerOf(_tokenId);
        uint256 price = nftPrices[_tokenId];
        uint256 contractFee = price.mul(CONTRACT_FEE_PERCENT).div(100);
        uint256 sellerProceeds = price.sub(contractFee);

        balances[seller] = balances[seller].add(sellerProceeds);
        balances[address(this)] = balances[address(this)].add(contractFee);

        _transfer(seller, msg.sender, _tokenId);
        emit NFTSold(_tokenId, msg.sender, price);
    }


    function withdraw() external nonReentrant  {
        require(balances[msg.sender] > 0, "NFTMarketplace: No balance to withdraw");
        uint256 amount = balances[msg.sender];
        balances[msg.sender] = 0;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "NFTMarketplace: Transfer failed");
    }

    // function assignRole(address _address, bytes32 _role) external onlyRole(DEFAULT_ADMIN_ROLE) {
    //     grantRole(_role, _address);
    // }

    function assignCreatorRole(address _address) external  onlyRole(DEFAULT_ADMIN_ROLE){
        grantRole(CREATOR_ROLE, _address);
    }

    function assignBuyerRole(address _address) external  onlyRole(DEFAULT_ADMIN_ROLE){
        grantRole(BUYER_ROLE, _address);
    }

    function assignSellerRole(address _address) external  onlyRole(DEFAULT_ADMIN_ROLE){
        grantRole(SELLER_ROLE, _address);
    }

    function assignAdminRole(address _address) external  onlyRole(DEFAULT_ADMIN_ROLE){
        grantRole(ADMIN_ROLE, _address);
    }

    function revokeRole(address _address, bytes32 _role) external onlyRole(DEFAULT_ADMIN_ROLE) {
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
        uint256 counter = 0;
        for (uint256 i = 0; i < totalListedTokens; i++) {
            if (idToListedToken[i].owner == msg.sender) {
                listedTokens[counter] = idToListedToken[i];
                counter++;
            }   
        }
        // Create a new array with the correct length
        ListedToken[] memory myTokens = new ListedToken[](counter);
        for (uint256 i = 0; i < counter; i++) {
            myTokens[i] = listedTokens[i];
        }
        return myTokens;
    }

    function getListedTokenForId(uint256 tokenId) public view returns (ListedToken memory) {
        return idToListedToken[tokenId];
    }

   function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function getTokenIdCounter() public view returns (uint256) {
        return Counters.current(_tokenIdCounter);
    }


    function sellNfts(uint256 _tokenId) public payable onlyRole(SELLER_ROLE) {
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
