import { createFileRoute } from "@tanstack/react-router";
import { SignIn } from "@clerk/tanstack-start";
import { ClerkGate, AuthUnavailable } from "~/components/ClerkGate";

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
});

function SignInPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md">
        <ClerkGate
          fallback={
            <AuthUnavailable
              title="Sign-in is not available yet"
              message="Clerk authentication isn't configured for this deployment yet. The rest of BetIQ works fine — check back soon."
            />
          }
        >
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-betiq-900 border border-betiq-800 shadow-xl rounded-xl",
                headerTitle: "text-betiq-100 text-2xl font-bold",
                headerSubtitle: "text-betiq-400",
                socialButtonsBlockButton: "border-betiq-700 text-betiq-200 hover:bg-betiq-800",
                formButtonPrimary: "bg-gold-500 hover:bg-gold-400 text-betiq-950",
                footerActionLink: "text-gold-400 hover:text-gold-300",
                formFieldInput: "bg-betiq-950 border-betiq-700 text-betiq-100",
              },
            }}
          />
        </ClerkGate>
      </div>
    </div>
  );
}
