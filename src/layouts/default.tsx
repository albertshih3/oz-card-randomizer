import { Navbar } from "@/components/navbar";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col min-h-screen bg-background">
      {/* Subtle background gradient */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background opacity-50 dark:opacity-30"></div>
      </div>

      <Navbar />
      <main className="container mx-auto max-w-7xl px-6 flex-grow pt-16 relative z-10">
        {children}
      </main>
      <footer className="w-full flex items-center justify-center py-6 relative z-10">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Oakland Zoo. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
