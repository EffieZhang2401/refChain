import { ethers } from 'ethers';
import { env } from '../env';

const pointsAbi = [
  'function registerMerchant(string uriFragment, string name) external returns (uint256)',
  'function mintPoints(address account, uint256 merchantId, uint256 amount, bytes data) external',
  'function burnPoints(address account, uint256 merchantId, uint256 amount) external',
  'event MerchantRegistered(uint256 indexed merchantId, string name, string uriFragment)'
];

export function getPointsContract() {
  if (!env.POINTS_CONTRACT_ADDRESS || !env.POLYGON_AMOY_RPC_URL || !env.WEB3_PRIVATE_KEY) {
    return null;
  }

  const provider = new ethers.JsonRpcProvider(env.POLYGON_AMOY_RPC_URL);
  const wallet = new ethers.Wallet(env.WEB3_PRIVATE_KEY, provider);
  return new ethers.Contract(env.POINTS_CONTRACT_ADDRESS, pointsAbi, wallet);
}
