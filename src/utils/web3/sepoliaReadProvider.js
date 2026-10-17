import { AbstractProvider, InfuraProvider, JsonRpcProvider, Network } from 'ethers';
import { ETH_SEPOLIA } from '../constants/web3Constants';

// FallbackProvider permanently excludes backends that fail its initial sync.
// If all fail (for example, rejected API keys), every later read throws
// "no runners?!". Keep Sepolia reads retryable without that sticky failure.
export class SepoliaReadProvider extends AbstractProvider {
  constructor(projectId) {
    const network = Network.from(ETH_SEPOLIA);
    super(network);
    this.infura = new InfuraProvider(network, projectId);
    this.publicRpc = new JsonRpcProvider(
      'https://ethereum-sepolia-rpc.publicnode.com',
      network,
      { staticNetwork: network },
    );
  }

  async _detectNetwork() {
    return Network.from(ETH_SEPOLIA);
  }

  async _perform(request) {
    try {
      return await this.infura._perform(request);
    } catch (error) {
      // The public endpoint is a read fallback only. Existing sends keep
      // their configured Infura route, including any authentication error.
      if (request.method === 'broadcastTransaction') throw error;
      return this.publicRpc._perform(request);
    }
  }

  destroy() {
    this.infura.destroy();
    this.publicRpc.destroy();
    super.destroy();
  }
}
