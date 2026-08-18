import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
