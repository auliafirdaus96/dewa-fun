import { NextRequest, NextResponse } from 'next/server';
import { rng } from '../../../../services/RngService';

export async function POST(req: NextRequest) {
  try {
    const { serverSeed, clientSeed, nonce, betId } = await req.json();

    if (!serverSeed || !clientSeed || nonce === undefined) {
      return NextResponse.json({ error: 'serverSeed, clientSeed, and nonce are required' }, { status: 400 });
    }

    // Reproduce the roll using the provably fair algorithm
    const { roll, hmac } = rng.roll(serverSeed, clientSeed, nonce);
    const serverSeedHash = rng.hashSeed(serverSeed);

    return NextResponse.json({
      verified: true,
      betId,
      roll,
      serverSeed,
      serverSeedHash,
      clientSeed,
      nonce,
      hmac,
      proof: `Roll ${roll} was generated from HMAC-SHA512(serverSeed, "${clientSeed}:${nonce}") % 100`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
