import { ethers } from 'ethers';

const rpcUrl = process.env.POLYGON_AMOY_RPC_URL;
const privateKey = process.env.WEB3_PRIVATE_KEY;
const contractAddress = process.env.POINTS_CONTRACT_ADDRESS;

const contractAbi = [
  'function mint(address to, uint256 id, uint256 amount) public',
  'function balanceOf(address account, uint256 id) public view returns (uint256)'
];

let contract: ethers.Contract | null = null;

if (rpcUrl && privateKey && contractAddress) {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    contract = new ethers.Contract(contractAddress, contractAbi, wallet);
    console.log('[web3] Polygon bridge initialised');
  } catch (error) {
    console.warn('[web3] Failed to initialise Polygon bridge:', error);
  }
} else {
  console.warn('[web3] Missing RPC / PRIVATE_KEY / CONTRACT_ADDRESS, on-chain sync disabled');
}

export const isWeb3Enabled = () => Boolean(contract);

export async function mintPoints(to: string, tokenId: number, amount: number) {
  if (!contract) {
    throw new Error('Web3未配置');
  }
  const tx = await contract.mint(to, ethers.toBigInt(tokenId), ethers.toBigInt(amount));
  const receipt = await tx.wait();
  return {
    transactionHash: receipt?.hash ?? tx.hash
  };
}

export async function getOnchainBalance(address: string, tokenId: number) {
  if (!contract) {
    return null;
  }
  const balance = await contract.balanceOf(address, ethers.toBigInt(tokenId));
  return Number(balance);
}
