import DefaultLayout from "@/layouts/default";
import { motion } from "framer-motion";
import {
  Info,
  HelpCircle,
  ShieldAlert,
  Mail,
  MapPin,
  QrCode,
  Play,
  Layers,
  AlertTriangle,
} from "lucide-react";

export default function DocsPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <DefaultLayout>
      <motion.div
        className="container mx-auto px-4 py-12 max-w-5xl"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            About & Documentation
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about the Oakland Zoo Booster Pack
            Generator, from getting started to administrative tools.
          </p>
        </motion.div>

        {/* Introduction Card */}
        <motion.div
          variants={itemVariants}
          className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 mb-8 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6 border-b border-border/50 pb-4">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Info className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold">What is this app?</h2>
          </div>
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <p className="text-lg leading-relaxed text-foreground/90">
              The booster pack generator app creates random card selections that
              can be used to assemble complete booster packs for the Oakland Zoo
              Trading Card program.
            </p>
            <div className="mt-6 bg-muted/30 p-6 rounded-xl border border-border/50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                How to access
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="mt-1 p-1 rounded-full bg-primary/10 text-primary">
                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                  </div>
                  <span>
                    Visit{" "}
                    <a
                      href="https://ozboosterpacks.albertshih.org/"
                      className="text-primary hover:underline font-medium"
                    >
                      ozboosterpacks.albertshih.org
                    </a>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 p-1 rounded-full bg-primary/10 text-primary">
                    <QrCode className="w-3 h-3" />
                  </div>
                  <span>Scan the QR code on the ZooCamp/TWG HQ whiteboard</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 p-1 rounded-full bg-primary/10 text-primary">
                    <QrCode className="w-3 h-3" />
                  </div>
                  <span>
                    Scan the QR code on the On-Grounds Corkboard (by desks)
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* How To Use Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <motion.div
            variants={itemVariants}
            className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-sm h-full"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Play className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold">Quick Start Guide</h2>
            </div>
            <ol className="space-y-4">
              {[
                "Navigate to the website",
                'Press "Generate Booster Pack!" on the top left corner',
                "Pull the cards specified from Mint card box to make your booster pack",
                "Check off cards as you create the pack",
                "Repeat as desired",
              ].map((step, i) => (
                <li key={i} className="flex gap-4">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                    {i + 1}
                  </span>
                  <span className="text-foreground/90">{step}</span>
                </li>
              ))}
            </ol>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-sm h-full"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <Layers className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold">Multiple Packs</h2>
            </div>
            <ol className="space-y-4">
              {[
                "Navigate to the website",
                "Select from 5, 10, or 20 booster packs",
                "Expand or close each pack as necessary",
                "Pull the cards specified from Mint card box",
                "Check off cards as you create each pack",
              ].map((step, i) => (
                <li key={i} className="flex gap-4">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                    {i + 1}
                  </span>
                  <span className="text-foreground/90">{step}</span>
                </li>
              ))}
            </ol>
          </motion.div>
        </div>

        {/* Admin Section */}
        <motion.div
          variants={itemVariants}
          className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 mb-8 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6 border-b border-border/50 pb-4">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold">Editing Card Information</h2>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 flex gap-4 items-start">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-800 dark:text-amber-200">
                IMPORTANT: Please only edit cards if you have explicit
                permission from Patrick Wolff or an On-Grounds supervisor.
              </p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300/80 italic">
                (my trust was broken and now you also need an account :|)
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <p className="text-foreground/90">
              <span className="font-medium text-foreground">Access:</span> Click
              the &quot;Edit&quot; button in the top right of the screen. You
              will need to log in. Email{" "}
              <a
                href="mailto:ashih@oaklandzoo.org"
                className="text-primary hover:underline font-medium"
              >
                ashih@oaklandzoo.org
              </a>{" "}
              for access.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-muted/30 p-6 rounded-xl border border-border/50">
                <h3 className="font-semibold mb-3 text-lg">Managing Cards</h3>
                <ul className="space-y-2">
                  {[
                    "Toggle cards Active/Inactive (Active cards show up in the generator)",
                    "Edit card information (name, number, active status)",
                    "Delete cards (use only if approved by Patrick)",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 mt-2 flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-muted/30 p-6 rounded-xl border border-border/50">
                <h3 className="font-semibold mb-3 text-lg">Adding Cards</h3>
                <p className="mb-3 text-muted-foreground">
                  Click the blue plus button to add a card. You&apos;ll need:
                </p>
                <ul className="space-y-2">
                  {[
                    "Card name",
                    "Card number",
                    'Zoo section (Australia cards are labeled as "Special Editions")',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 mt-2 flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Help Section */}
        <motion.div
          variants={itemVariants}
          className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6 border-b border-border/50 pb-4">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold">Need Help?</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-muted/30 p-6 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors">
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Mail className="w-4 h-4" />
                App Support
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                For questions about using the app or to report bugs, contact:
              </p>
              <div className="flex flex-col">
                <span className="font-medium">Albert Shih</span>
                <a
                  href="mailto:ashih@oaklandzoo.org"
                  className="text-primary hover:underline text-sm"
                >
                  ashih@oaklandzoo.org
                </a>
              </div>
            </div>

            <div className="bg-muted/30 p-6 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors">
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Info className="w-4 h-4" />
                Program Information
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                For questions about the Trading Card program or booster packs,
                contact:
              </p>
              <div className="flex flex-col">
                <span className="font-medium">Patrick Wolff</span>
                <a
                  href="mailto:pwolff@oaklandzoo.org"
                  className="text-primary hover:underline text-sm"
                >
                  pwolff@oaklandzoo.org
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </DefaultLayout>
  );
}
