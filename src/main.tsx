import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.tsx";
import { Provider } from "./provider.tsx";
import "@/styles/globals.css";
import { ClerkProvider } from "@clerk/clerk-react";
import { ThemeProvider } from "@/hooks/use-theme";

import { Analytics } from "@vercel/analytics/react";
import { initGtag } from "@/lib/gtag";

// Clerk auth public key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Check if key exists
if (!PUBLISHABLE_KEY) {
  throw new Error("Add your Clerk Publishable Key to the .env.local file");
}

// Initialize Google Analytics
initGtag();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Provider>
          <ClerkProvider
            publishableKey={PUBLISHABLE_KEY}
            afterSignOutUrl="/"
            signInUrl="/sign-in"
          >
            <Analytics />
            <App />
          </ClerkProvider>
        </Provider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
