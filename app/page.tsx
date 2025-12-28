import { AuthButton } from "@/components/auth-button";
import Link from "next/link";
import { Suspense } from "react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <header className="w-full max-w-3xl p-4 flex justify-between items-center">
        <Link href={"/"}>BookingBTracker</Link>
        <Suspense>
          <AuthButton />
        </Suspense>
      </header>
    </main>
  );
}
