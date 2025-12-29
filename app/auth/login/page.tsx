import { redirect } from "next/navigation";

export default function Page() {
  // Redirect legacy nested auth route to the top-level /login page
  redirect("/login");
}
