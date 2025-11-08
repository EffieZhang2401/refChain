import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with ${deployer.address}`);

  const Contract = await ethers.getContractFactory('MultiMerchantPoints');
  const contract = await Contract.deploy('https://refchain.dev/meta/{id}.json', deployer.address);
  await contract.waitForDeployment();

  console.log(`MultiMerchantPoints deployed to ${await contract.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
