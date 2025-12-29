import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.redirect(new URL("/login", "http://localhost:3000"));
}

export function POST() {
  return NextResponse.redirect(new URL("/login", "http://localhost:3000"));
}
