const { expect } = require("chai");

describe("NFTMarketplace", function () {
    let nftMarketplace;
    let owner;
    let creator;
    let seller;
    let buyer;
    let tokenId;

    beforeEach(async function () {
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
        const tokenURI = "https://example.com/token";
        const price = ethers.utils.parseEther("1");

        await nftMarketplace.connect(creator).createToken(tokenURI, price);

        const tokenId = await nftMarketplace._tokenIdCounter();
        const tokenOwner = await nftMarketplace.ownerOf(tokenId);
        const tokenURIStored = await nftMarketplace.tokenURI(tokenId);

        expect(tokenOwner).to.equal(creator.address);
        expect(tokenURIStored).to.equal(tokenURI);
    });

    it("should list an NFT", async function () {
        const price = ethers.utils.parseEther("1");

        await nftMarketplace.connect(buyer).listNFT(tokenId, price);

        const listedToken = await nftMarketplace.idToListedToken(tokenId);

        expect(listedToken.price).to.equal(price);
        expect(listedToken.isListed).to.be.true;
    });

    it("should set the price of an NFT", async function () {
        const price = ethers.utils.parseEther("1");

        await nftMarketplace.connect(seller).setPrice(tokenId, price);

        const nftPrice = await nftMarketplace.nftPrices(tokenId);

        expect(nftPrice).to.equal(price);
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