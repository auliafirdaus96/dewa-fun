import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

import { requireAuth } from '@/lib/apiAuth';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { nodeId, feature, active, encryptedApiKey } = await req.json();

    if (!nodeId || !feature) {
      return NextResponse.json({ error: 'nodeId and feature are required' }, { status: 400 });
    }

    const updateData: any = {};
    if (feature === 'social') updateData.is_social_active = active;
    if (feature === 'dlmm') updateData.is_dlmm_active = active;
    if (encryptedApiKey) updateData.encrypted_api_key = encryptedApiKey;

    const { data, error } = await supabase
      .from('agent_nodes')
      .update(updateData)
      .eq('node_id', nodeId)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('[Activate API Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
