import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.tsx";
import { Provider } from "./provider.tsx";
import "@/styles/globals.css";
import { ClerkProvider } from '@clerk/clerk-react'

// Clerk auth public key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// Check if key exists
if (!PUBLISHABLE_KEY) {
	throw new Error('Add your Clerk Publishable Key to the .env.local file')
}

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<BrowserRouter>
			<Provider>
				<ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
					<App />
				</ClerkProvider>
			</Provider>
		</BrowserRouter>
	</React.StrictMode>,
);
