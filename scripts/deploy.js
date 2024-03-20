const fs = require('fs');
const { ethers, upgrades } = require('hardhat');
const hre = require('hardhat');

async function main() {
    const Contract = await hre.ethers.getContractFactory("NFTMarketplace");

    const contract = await Contract.deploy();
    await contract.waitForDeployment();


    const data = {
        address: contract.address,
        abi: JSON.parse(contract.interface.format('json'))
    };
    fs.writeFileSync('src/NFTMarketplace.json', JSON.stringify(data));

    console.log('Contract deployed successfully!');
    console.log('Contract address:', contract.target);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });