"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TrackerApp from "@/app/tracker/_components/trackerapp";
import { createClient } from "@/lib/supabase/client";

export default function Page() {
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!data?.user) {
          router.replace("/login");
          return;
        }
        setReady(true);
      } catch {
        router.replace("/login");
      }
    };
    check();
  }, [router]);

  if (!ready) return null;
  return <TrackerApp />;
}
