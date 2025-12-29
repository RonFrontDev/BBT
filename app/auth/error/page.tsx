import { redirect } from "next/navigation";

export default function Page() {
  // Redirect legacy auth error route to the minimal login page
  redirect("/login");
}
