import { createFileRoute } from "@tanstack/react-router";
import { SignUp } from "@clerk/tanstack-start";

export const Route = createFileRoute("/sign-up")({
  component: SignUpPage,
});

function SignUpPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md">
        <SignUp
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
      </div>
    </div>
  );
}