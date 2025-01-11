"use client";

import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  UserButton,
  SignInButton
} from "@clerk/nextjs";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <header style={{ display: "flex", justifyContent: "space-between", padding: "1rem" }}>
            <Link href='/'><h1>Booster Pack Generator</h1></Link>
            <div>
              <SignedIn>
                <UserButton />
              </SignedIn>
              <SignedOut>
                <SignInButton />
              </SignedOut>
            </div>
          </header>
          {children}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
