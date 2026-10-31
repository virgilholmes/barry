import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";

export default function SignInPage() {
  return (
    <AuthShell>
      <Suspense>
        <SignIn />
      </Suspense>
    </AuthShell>
  );
}
