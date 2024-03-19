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
        const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
        nftMarketplace = await NFTMarketplace.deploy();
        await nftMarketplace.deployed();

        [owner, creator, seller, buyer] = await ethers.getSigners();

        await nftMarketplace.assignRole(creator.address, ethers.utils.id("CREATOR_ROLE"));
        await nftMarketplace.assignRole(seller.address, ethers.utils.id("SELLER_ROLE"));
        await nftMarketplace.assignRole(buyer.address, ethers.utils.id("BUYER_ROLE"));

        tokenId = await createToken();
    });

    async function createToken() {
        const tokenURI = "https://example.com/token";
        const price = ethers.utils.parseEther("1");

        await nftMarketplace.connect(creator).createToken(tokenURI, price);
        const tokenId = await nftMarketplace._tokenIdCounter();

        return tokenId;
    }

    it("should create a token", async function () {
        const tokenId = await createToken();
        const tokenOwner = await nftMarketplace.ownerOf(tokenId);
        const tokenURIStored = await nftMarketplace.tokenURI(tokenId);

        console.log(`Token owner: ${tokenOwner}`);
        console.log(`Stored token URI: ${tokenURIStored}`);

        expect(tokenOwner).to.equal(creator.address);
        expect(tokenURIStored).to.equal("https://example.com/token");
    });


    it("should buy an NFT", async function () {
        const tokenId = await createToken();
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