import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";

export const metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <LoginForm />
    </Suspense>
  );
}
