import { PublicKey, Connection } from "@solana/web3.js";
import { WalletActivity } from "@/lib/types/airdrop";

// Known program IDs for categorization
const PROGRAM_CATEGORIES = {
  // DeFi protocols
  defi: [
    "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", // Jupiter
    "Jito4E1FxqhR6FkU4VyXGj9kZy9rWnHzNDR5mVYzQsT", // Jito
    "marBjsLQjFHMz4BkGfZvqTJZvJhZ1", // MarginFi
    "dRIFT5XGhJN9K1RvNqJz8V1", // Drift
    "SHARKobtfF1bHhxDZimZjQ", // Sharky
    "LendLeaseProgram1111111111111111111111111", // Lending protocols
  ],
  // NFT marketplaces
  nft: [
    "TSWAPcL9Ly28vwZJ", // Tensor
    "magnumLXvALd9eZ7xXxZvN", // Magic Eden
    "NFTMarketplaceProgram11111111111111111", // Generic NFT
  ],
  // Bridges
  bridges: [
    "wormDTUJ6RCPNLsX1DYvM", // Wormhole
    "allbridgeProgram1111111111111111111", // Allbridge
    "deBridgeProgram111111111111111111111", // deBridge
  ],
  // Oracles
  oracles: [
    "FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH", // Pyth
    "SwitchboardProgram111111111111111111", // Switchboard
  ],
  // Governance
  governance: [
    "GovProgram1111111111111111111111111", // Solana Governance
    "RealmProgram111111111111111111111", // Realm DAO
  ],
  // Gaming
  gaming: [
    "ATLAS7kUqNzjN1", // Star Atlas
    "AuroryProgram1111111111111111111", // Aurory
    "GenopetsProgram111111111111111", // Genopets
  ],
};

// Known NFT collections
const NFT_COLLECTIONS = {
  "star-atlas-ship": ["StarAtlasShipCollection111111111111"],
  "okay-bears": ["OkayBearCollection111111111111111111"],
  "degods": ["DeGodsCollection1111111111111111111"],
  "y00ts": ["Y00tsCollection1111111111111111111"],
};

export class WalletScanner {
  private connection: Connection;
  
  constructor(connection: Connection) {
    this.connection = connection;
  }
  
  async scanWallet(walletAddress: string): Promise<WalletActivity> {
    const activity: WalletActivity = {
      address: walletAddress,
      programs: new Set(),
      tokens: new Map(),
      nfts: new Set(),
      governanceActions: new Set(),
      bridges: new Set(),
      transactionCounts: new Map(),
    };
    
    try {
      const pubKey = new PublicKey(walletAddress);
      
      // Get token accounts
      const tokenAccounts = await this.connection.getTokenAccountsByOwner(pubKey, {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      });
      
      // Process token accounts
      for (const account of tokenAccounts.value) {
        const info = await this.connection.getParsedAccountInfo(account.pubkey);
        if (info.value && typeof info.value.data === 'object' && 'parsed' in info.value.data) {
          const parsed = info.value.data.parsed;
          if (parsed.type === 'account' && parsed.info.tokenAmount.uiAmount > 0) {
            const mint = parsed.info.mint;
            const amount = parsed.info.tokenAmount.uiAmount;
            activity.tokens.set(mint, (activity.tokens.get(mint) || 0) + amount);
          }
        }
      }
      
      // Get NFTs (non-decimal tokens)
      const nftAccounts = await this.connection.getTokenAccountsByOwner(pubKey, {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      });
      
      for (const account of nftAccounts.value) {
        const info = await this.connection.getParsedAccountInfo(account.pubkey);
        if (info.value && typeof info.value.data === 'object' && 'parsed' in info.value.data) {
          const parsed = info.value.data.parsed;
          if (parsed.type === 'account' && parsed.info.tokenAmount.amount === '1') {
            const mint = parsed.info.mint;
            activity.nfts.add(mint);
          }
        }
      }
      
      // Get recent transactions to identify programs
      const signatures = await this.connection.getSignaturesForAddress(pubKey, { limit: 100 });
      
      for (const sig of signatures) {
        const tx = await this.connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });
        
        if (tx) {
          // Extract programs from transaction
          tx.transaction.message.accountKeys.forEach((account) => {
            const pubkey = account.pubkey.toString();
            activity.programs.add(pubkey);
            
            // Count transactions per program
            activity.transactionCounts.set(
              pubkey,
              (activity.transactionCounts.get(pubkey) || 0) + 1
            );
          });
          
          // Check for governance actions
          tx.transaction.instructions.forEach((ix) => {
            const programId = ix.programId.toString();
            
            // Governance program detection
            if (PROGRAM_CATEGORIES.governance.some(p => programId.includes(p))) {
              activity.governanceActions.add("vote");
            }
            
            // Bridge detection
            if (PROGRAM_CATEGORIES.bridges.some(p => programId.includes(p))) {
              activity.bridges.add("wormhole");
            }
          });
          
          // Update first/last transaction dates
          const txTime = new Date(sig.blockTime! * 1000);
          if (!activity.firstTransactionDate || txTime < activity.firstTransactionDate) {
            activity.firstTransactionDate = txTime;
          }
          if (!activity.lastTransactionDate || txTime > activity.lastTransactionDate) {
            activity.lastTransactionDate = txTime;
          }
        }
      }
      
    } catch (error) {
      console.error("Error scanning wallet:", error);
      // Return partial activity on error
    }
    
    return activity;
  }
  
  async getWalletValue(walletAddress: string): Promise<number> {
    try {
      const pubKey = new PublicKey(walletAddress);
      const balance = await this.connection.getBalance(pubKey);
      const solPrice = await this.getSolPrice();
      
      let totalValue = (balance / 1e9) * solPrice;
      
      // Add token values
      const tokenAccounts = await this.connection.getTokenAccountsByOwner(pubKey, {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      });
      
      for (const account of tokenAccounts.value) {
        const info = await this.connection.getParsedAccountInfo(account.pubkey);
        if (info.value && typeof info.value.data === 'object' && 'parsed' in info.value.data) {
          const parsed = info.value.data.parsed;
          if (parsed.type === 'account') {
            // Would need token price oracle for accurate valuation
            // For now, just count SOL
          }
        }
      }
      
      return totalValue;
    } catch (error) {
      console.error("Error getting wallet value:", error);
      return 0;
    }
  }
  
  private async getSolPrice(): Promise<number> {
    try {
      const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
      const data = await response.json();
      return data.solana.usd;
    } catch {
      return 100; // Fallback price
    }
  }
}
