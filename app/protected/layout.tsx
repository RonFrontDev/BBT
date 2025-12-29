import { redirect } from "next/navigation";

export default function ProtectedLayout() {
  // Redirect any nested protected layout usage to the minimal login flow
  redirect("/login");
}
