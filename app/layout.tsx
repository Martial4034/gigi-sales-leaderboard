// app/layout.tsx
import type { Metadata } from "next";
import {
  ClerkProvider,
  SignedIn,
  UserButton,
} from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "MAYA Sales Leaderboard",
  description: "Leaderboard MAYA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="fr">
        <body>
          <SignedIn>
            <div className="fixed top-4 right-4 z-50">
              <UserButton />
            </div>
          </SignedIn>
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}