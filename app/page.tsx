import { redirect } from "next/navigation";

export default function Home() {
  // Redirect root to /login — single entry point
  redirect("/login");
}
