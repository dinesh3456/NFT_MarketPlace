const { ethers } = require("hardhat");
let expect;

describe("NFTMarketplace", function () {
    let nftMarketplace;
    let owner;
    let creator;
    let seller;
    let buyer;
    let tokenId;

    beforeEach(async function () {
        const chai = await import('chai');
        expect = chai.expect;
        [owner, creator, seller, buyer] = await ethers.getSigners();
        const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
        nftMarketplace = await NFTMarketplace.deploy();
        await nftMarketplace.deployed();
    
        console.log("Assigning roles...");
    
        // Assign roles using keccak256 hashes of role names
        await nftMarketplace.grantRole(await nftMarketplace.ADMIN_ROLE(), owner.address);
        await nftMarketplace.grantRole(await nftMarketplace.CREATOR_ROLE(), creator.address);
        await nftMarketplace.grantRole(await nftMarketplace.SELLER_ROLE(), seller.address);
        await nftMarketplace.grantRole(await nftMarketplace.BUYER_ROLE(), buyer.address);
        console.log("Roles assigned.");
    
        tokenId = await createAndListToken();
    });

    async function createAndListToken() {
        const tokenURI = "https://example.com/token";
        const price = ethers.utils.parseEther("1");
        console.log("Creating and listing token...");
        await nftMarketplace.connect(creator).createAndListToken(tokenURI, price);
        console.log("Token created and listed.");
        const tokenId = await nftMarketplace.getTokenIdCounter();

        return tokenId;
    }

    it("should create a token", async function () {
        const tokenId = await createAndListToken();
        const tokenOwner = await nftMarketplace.ownerOf(tokenId);
        const tokenURIStored = await nftMarketplace.tokenURI(tokenId);

        console.log(`Token owner: ${tokenOwner}`);
        console.log(`Stored token URI: ${tokenURIStored}`);

        expect(tokenOwner).to.equal(creator.address);
        expect(tokenURIStored).to.equal("https://example.com/token");
    });


    it("should buy an NFT", async function () {
        const tokenId = await createAndListToken();
        const price = ethers.utils.parseEther("1");
        const initialBuyerBalance = await ethers.provider.getBalance(buyer.address);

        await nftMarketplace.connect(buyer).buyNFT(tokenId, { value: price });

        const tokenOwner = await nftMarketplace.ownerOf(tokenId);
        const finalBuyerBalance = await ethers.provider.getBalance(buyer.address);

        console.log(`New token owner: ${tokenOwner}`);
        console.log(`Final buyer balance: ${finalBuyerBalance}`);

        expect(tokenOwner).to.equal(buyer.address);
        expect(finalBuyerBalance).to.be.above(initialBuyerBalance.sub(price));
    });

    it("should withdraw balance", async function () {
        const initialOwnerBalance = await ethers.provider.getBalance(owner.address);

        await nftMarketplace.connect(owner).withdraw();

        const finalOwnerBalance = await ethers.provider.getBalance(owner.address);

        console.log(`Final owner balance: ${finalOwnerBalance}`);

        expect(finalOwnerBalance).to.be.above(initialOwnerBalance);
    });

    it("should buy an NFT", async function () {
        const price = ethers.utils.parseEther("1");

        await nftMarketplace.connect(buyer).buyNFT(tokenId, { value: price });

        const tokenOwner = await nftMarketplace.ownerOf(tokenId);
        const buyerBalance = await ethers.provider.getBalance(buyer.address);

        expect(tokenOwner).to.equal(buyer.address);
        expect(buyerBalance).to.be.above(price);
    });

    it("should withdraw balance", async function () {
        const amount = ethers.utils.parseEther("1");

        await nftMarketplace.connect(owner).withdraw();

        const ownerBalance = await ethers.provider.getBalance(owner.address);

        expect(ownerBalance).to.be.above(amount);
    });
});