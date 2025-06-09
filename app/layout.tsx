// app/layout.tsx
import type { Metadata } from "next";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
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
          <header className="w-full flex justify-end items-center p-4">
            <SignedOut>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}