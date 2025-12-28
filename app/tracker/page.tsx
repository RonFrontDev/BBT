import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

async function TrackerData() {
  const supabase = await createClient();
  const { data: tracker } = await supabase.from("time_tracker").select();

  return <pre>{JSON.stringify(tracker, null, 2)}</pre>;
}

export default function Trackers() {
  return (
    <Suspense fallback={<div>Loading trackers...</div>}>
      <TrackerData />
    </Suspense>
  );
}
