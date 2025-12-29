import { redirect } from "next/navigation";

export default function Page() {
  // Redirect legacy protected route to the minimal login flow
  redirect("/login");
}
