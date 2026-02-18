// PUT /api/airdrops/[id] - Update airdrop (admin only)
// DELETE /api/airdrops/[id] - Delete airdrop (admin only)

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { getAirdropById, updateAirdrop, deleteAirdrop } from "@/lib/data/airdrop-store";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Apply rate limiting
  const rateLimitResponse = rateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;
  
  // Check for admin token
  const authHeader = request.headers.get("authorization");
  const adminToken = process.env.ADMIN_TOKEN;
  
  if (adminToken && authHeader !== `Bearer ${adminToken}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  try {
    const body = await request.json();
    const airdrop = await getAirdropById(params.id);
    
    if (!airdrop) {
      return NextResponse.json(
        { success: false, error: "Airdrop not found" },
        { status: 404 }
      );
    }
    
    await updateAirdrop(params.id, body);
    
    return NextResponse.json({
      success: true,
      message: "Airdrop updated successfully",
    });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to update airdrop",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Apply rate limiting
  const rateLimitResponse = rateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;
  
  // Check for admin token
  const authHeader = request.headers.get("authorization");
  const adminToken = process.env.ADMIN_TOKEN;
  
  if (adminToken && authHeader !== `Bearer ${adminToken}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  try {
    const airdrop = await getAirdropById(params.id);
    
    if (!airdrop) {
      return NextResponse.json(
        { success: false, error: "Airdrop not found" },
        { status: 404 }
      );
    }
    
    await deleteAirdrop(params.id);
    
    return NextResponse.json({
      success: true,
      message: "Airdrop deleted successfully",
    });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to delete airdrop",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
