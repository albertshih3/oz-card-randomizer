"use client";

import React from "react";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import CardManagement from "../components/CardManagement";

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAtKLKB3-Nl0fP-9yeYd9SywiMXyAgtpLM",
  authDomain: "oz-card-randomizer.firebaseapp.com",
  projectId: "oz-card-randomizer",
  storageBucket: "oz-card-randomizer.appspot.com",
  messagingSenderId: "1060427616291",
  appId: "1:1060427616291:web:30e164d8a82a8d8899a196",
  measurementId: "G-D3P5Y0M38K",
};

const app = initializeApp(firebaseConfig);
const analytics = isSupported().then((yes) => (yes ? getAnalytics(app) : null));
const db = getFirestore(app);

export default function EditPage() {
  return (
    <>
      <SignedIn>
        <CardManagement />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
