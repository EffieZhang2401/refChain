import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.21',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    amoy: {
      url: process.env.POLYGON_AMOY_RPC_URL || '',
      accounts: process.env.WEB3_PRIVATE_KEY ? [process.env.WEB3_PRIVATE_KEY] : []
    }
  }
};

export default config;
