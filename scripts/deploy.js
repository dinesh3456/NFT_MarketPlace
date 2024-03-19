const fs = require('fs');
const { ethers, upgrades } = require('hardhat');
const hre = require('hardhat');

async function main() {
    const Contract = await hre.ethers.getContractFactory("NFTMarketplace");

    const contract = await Contract.deploy();
    await contract.deployed();

    // Get the contract's ABI and bytecode
    const abi = Contract.interface.format('json');

    const data = {
        address: contract.address,
        abi: JSON.parse(abi)
    };
    fs.writeFileSync('src/NFTMarketplace.json', JSON.stringify(data, null, 2));

    console.log('Contract deployed successfully!');
    console.log('Contract address:', contract.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });