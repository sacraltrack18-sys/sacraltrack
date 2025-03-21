import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const data = await request.formData();
  const email = data.get('email');

  if (email === 'manager@yoursite.com') {
    return NextResponse.redirect('/manager/dashboard');
  }

  return NextResponse.redirect('/manager/auth');
} 