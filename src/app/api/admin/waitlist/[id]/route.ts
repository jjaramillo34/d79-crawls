import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';

// Remove someone from the waitlist
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid waitlist id' }, { status: 400 });
    }

    const db = await getDatabase();
    const result = await db.collection('waitlist').findOneAndDelete({ _id: new ObjectId(id) });
    if (!result) {
      return NextResponse.json({ error: 'Waitlist entry not found' }, { status: 404 });
    }

    console.log(`Waitlist entry ${id} (${result.email}) removed by ${auth.email}`);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error removing waitlist entry:', error);
    return NextResponse.json({ error: 'Failed to remove waitlist entry' }, { status: 500 });
  }
}
