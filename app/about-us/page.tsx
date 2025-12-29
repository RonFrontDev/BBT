import { redirect } from "next/navigation";

export default function Page() {
  // Redirect About page to the minimal login flow in this slimmed-down app
  redirect("/login");
}
