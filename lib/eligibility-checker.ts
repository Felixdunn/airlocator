import { Airdrop, AirdropRule, WalletActivity, EligibilityResult } from "@/lib/types/airdrop";

export class EligibilityChecker {
  /**
   * Check if a wallet is eligible for an airdrop based on rules
   */
  static checkEligibility(
    walletActivity: WalletActivity,
    airdrop: Airdrop
  ): EligibilityResult {
    const { rules } = airdrop;
    const missingRequirements: string[] = [];
    
    // Check required programs
    if (rules.requiredPrograms && rules.requiredPrograms.length > 0) {
      const hasRequiredProgram = rules.requiredPrograms.some(program =>
        Array.from(walletActivity.programs).some(wp => wp.includes(program.slice(0, 8)))
      );
      
      if (!hasRequiredProgram) {
        missingRequirements.push("Required program interaction not found");
      }
    }
    
    // Check minimum transactions
    if (rules.minTransactions) {
      const totalTransactions = Array.from(walletActivity.transactionCounts.values()).reduce(
        (sum, count) => sum + count,
        0
      );
      
      if (totalTransactions < rules.minTransactions) {
        missingRequirements.push(
          `Minimum ${rules.minTransactions} transactions required (found ${totalTransactions})`
        );
      }
    }
    
    // Check required tokens
    if (rules.requiredTokens && rules.requiredTokens.length > 0) {
      const hasRequiredToken = rules.requiredTokens.some(token =>
        walletActivity.tokens.has(token)
      );
      
      if (!hasRequiredToken) {
        missingRequirements.push("Required token not held");
      }
    }
    
    // Check minimum token amount
    if (rules.minTokenAmount && rules.requiredTokens) {
      const hasMinAmount = rules.requiredTokens.some(token => {
        const amount = walletActivity.tokens.get(token) || 0;
        return amount >= rules.minTokenAmount!;
      });
      
      if (!hasMinAmount) {
        missingRequirements.push(`Minimum token amount: ${rules.minTokenAmount}`);
      }
    }
    
    // Check required NFTs
    if (rules.requiredNFTs && rules.requiredNFTs.length > 0) {
      const hasRequiredNFT = rules.requiredNFTs.some(collection =>
        Array.from(walletActivity.nfts).some(nft => 
          // In production, would check against actual collection mints
          nft.includes(collection.slice(0, 8))
        )
      );
      
      if (!hasRequiredNFT) {
        missingRequirements.push("Required NFT not held");
      }
    }
    
    // Check governance actions
    if (rules.governanceActions && rules.governanceActions.length > 0) {
      const hasGovernanceAction = rules.governanceActions.some(action =>
        walletActivity.governanceActions.has(action)
      );
      
      if (!hasGovernanceAction) {
        missingRequirements.push("Required governance action not found");
      }
    }
    
    // Check bridge usage
    if (rules.bridgeUsage && rules.bridgeUsage.length > 0) {
      const hasBridgeUsage = rules.bridgeUsage.some(bridge =>
        walletActivity.bridges.has(bridge)
      );
      
      if (!hasBridgeUsage) {
        missingRequirements.push("Required bridge usage not found");
      }
    }
    
    // Check testnet participation
    if (rules.testnetParticipation) {
      // In production, would check testnet activity
      // For now, this is a manual verification airdrop
      missingRequirements.push("Testnet participation verification required");
    }
    
    // Check time-based requirements
    if (rules.earliestTransaction && walletActivity.lastTransactionDate) {
      if (walletActivity.lastTransactionDate < rules.earliestTransaction) {
        missingRequirements.push(
          `Activity must be after ${rules.earliestTransaction.toLocaleDateString()}`
        );
      }
    }
    
    if (rules.latestTransaction && walletActivity.firstTransactionDate) {
      if (walletActivity.firstTransactionDate > rules.latestTransaction) {
        missingRequirements.push(
          `Activity must be before ${rules.latestTransaction.toLocaleDateString()}`
        );
      }
    }
    
    const eligible = missingRequirements.length === 0;
    
    // Calculate estimated value
    let estimatedValue: number | undefined;
    if (airdrop.estimatedValueUSD) {
      estimatedValue = airdrop.estimatedValueUSD;
    } else if (airdrop.estimatedValueRange) {
      estimatedValue = (airdrop.estimatedValueRange.min + airdrop.estimatedValueRange.max) / 2;
    }
    
    return {
      eligible,
      airdropId: airdrop.id,
      airdropName: airdrop.name,
      estimatedValue,
      reason: eligible 
        ? "Wallet meets all eligibility requirements" 
        : missingRequirements.join("; "),
      missingRequirements: eligible ? [] : missingRequirements,
      claimUrl: airdrop.claimUrl,
      frictionLevel: airdrop.frictionLevel,
      categories: airdrop.categories,
    };
  }
  
  /**
   * Check eligibility for all live airdrops
   */
  static checkAllAirdrops(
    walletActivity: WalletActivity,
    airdrops: Airdrop[]
  ): EligibilityResult[] {
    return airdrops
      .filter(a => a.live)
      .map(airdrop => this.checkEligibility(walletActivity, airdrop));
  }
  
  /**
   * Get eligible airdrops only
   */
  static getEligibleAirdrops(
    walletActivity: WalletActivity,
    airdrops: Airdrop[]
  ): EligibilityResult[] {
    return this.checkAllAirdrops(walletActivity, airdrops).filter(r => r.eligible);
  }
  
  /**
   * Calculate total potential value from eligible airdrops
   */
  static calculateTotalValue(results: EligibilityResult[]): number {
    return results
      .filter(r => r.eligible && r.estimatedValue)
      .reduce((sum, r) => sum + (r.estimatedValue || 0), 0);
  }
}
