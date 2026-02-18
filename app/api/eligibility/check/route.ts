import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { withValidation, validateAddress } from "@/lib/middleware/validation";
import { airdrops } from "@/lib/data/airdrops";
import { WalletScanner } from "@/lib/wallet-scanner";
import { EligibilityChecker } from "@/lib/eligibility-checker";
import { Connection } from "@solana/web3.js";

// POST /api/eligibility/check - Check wallet eligibility for airdrops
// This runs server-side to protect the eligibility logic
export const POST = withValidation(
  async (request: NextRequest) => {
    // Apply rate limiting (stricter for this endpoint)
    const rateLimitResponse = rateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;
    
    try {
      const body = await request.json();
      const { walletAddress, airdropId } = body;
      
      // Validate wallet address
      if (!walletAddress || !validateAddress(walletAddress)) {
        return NextResponse.json(
          { success: false, error: 'Valid wallet address required' },
          { status: 400 }
        );
      }
      
      // Create connection and scan wallet
      const connection = new Connection(process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com", {
        commitment: 'confirmed',
      });
      
      const scanner = new WalletScanner(connection);
      const activity = await scanner.scanWallet(walletAddress);
      
      // Check eligibility
      if (airdropId) {
        // Check specific airdrop
        const airdrop = airdrops.find(a => a.id === airdropId && a.live);
        
        if (!airdrop) {
          return NextResponse.json(
            { success: false, error: 'Airdrop not found' },
            { status: 404 }
          );
        }
        
        const result = EligibilityChecker.checkEligibility(activity, airdrop);
        
        // Return result without exposing rules
        return NextResponse.json({
          success: true,
          data: {
            eligible: result.eligible,
            airdropId: result.airdropId,
            airdropName: result.airdropName,
            estimatedValue: result.estimatedValue,
            frictionLevel: result.frictionLevel,
            categories: result.categories,
            claimUrl: result.claimUrl,
            // Don't expose missingRequirements in detail
            message: result.eligible 
              ? 'Wallet is eligible for this airdrop' 
              : 'Wallet does not meet eligibility requirements',
          },
        });
      } else {
        // Check all airdrops
        const results = EligibilityChecker.checkAllAirdrops(activity, airdrops);
        
        // Sanitize results (don't expose detailed rules)
        const sanitizedResults = results.map(result => ({
          eligible: result.eligible,
          airdropId: result.airdropId,
          airdropName: result.airdropName,
          estimatedValue: result.estimatedValue,
          frictionLevel: result.frictionLevel,
          categories: result.categories,
          claimUrl: result.claimUrl,
          message: result.eligible 
            ? 'Eligible' 
            : 'Not eligible',
        }));
        
        const eligibleCount = sanitizedResults.filter(r => r.eligible).length;
        const totalValue = sanitizedResults
          .filter(r => r.eligible && r.estimatedValue)
          .reduce((sum, r) => sum + (r.estimatedValue || 0), 0);
        
        return NextResponse.json({
          success: true,
          data: {
            results: sanitizedResults,
            summary: {
              totalAirdrops: sanitizedResults.length,
              eligibleCount,
              totalEstimatedValue: totalValue,
            },
          },
        });
      }
    } catch (error) {
      console.error('Eligibility check error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to check eligibility',
          message: 'An internal error occurred. Please try again later.',
        },
        { status: 500 }
      );
    }
  },
  { requireWallet: true }
);
