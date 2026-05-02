import DefaultLayout from "@/layouts/default";
import { motion } from "framer-motion";
import {
  pageVariants,
  listContainerVariants,
  listItemVariants,
} from "@/lib/motion";
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
  return (
    <DefaultLayout>
      <motion.div
        className="py-12 max-w-4xl mx-auto"
        variants={pageVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <div className="mb-10">
          <h1
            className="text-headline-large mb-3"
            style={{ color: "var(--md-sys-color-on-surface)" }}
          >
            About & Usage
          </h1>
          <p
            className="text-body-large"
            style={{ color: "var(--md-sys-color-on-surface-variant)" }}
          >
            Everything you need to know about the Oakland Zoo Booster Pack
            Generator, from getting started to administrative tools.
          </p>
        </div>

        <motion.div
          variants={listContainerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-5"
        >
          {/* What is this app */}
          <motion.section variants={listItemVariants}>
            <div
              className="rounded-3xl p-6 border"
              style={{
                background: "var(--md-sys-color-surface)",
                borderColor: "var(--md-sys-color-outline-variant)",
              }}
            >
              <div className="flex items-center gap-3 mb-5">
                <span
                  className="p-2 rounded-xl"
                  style={{
                    background: "var(--md-sys-color-primary-container)",
                    color: "var(--md-sys-color-on-primary-container)",
                  }}
                >
                  <Info size={20} />
                </span>
                <h2
                  className="text-title-large"
                  style={{ color: "var(--md-sys-color-on-surface)" }}
                >
                  What is this app?
                </h2>
              </div>

              <p
                className="text-body-large mb-5"
                style={{ color: "var(--md-sys-color-on-surface-variant)" }}
              >
                The booster pack generator app creates random card selections
                that can be used to assemble complete booster packs for the
                Oakland Zoo Trading Card program.
              </p>

              <div
                className="rounded-2xl p-4 border"
                style={{
                  background: "var(--md-sys-color-surface-variant)",
                  borderColor: "var(--md-sys-color-outline-variant)",
                }}
              >
                <h3
                  className="text-title-medium mb-3 flex items-center gap-2"
                  style={{ color: "var(--md-sys-color-on-surface)" }}
                >
                  <MapPin
                    size={16}
                    style={{ color: "var(--md-sys-color-primary)" }}
                  />
                  How to access
                </h3>
                <ul className="space-y-3">
                  {[
                    {
                      icon: <MapPin size={13} />,
                      label: (
                        <>
                          Visit{" "}
                          <a
                            href="https://ozboosterpacks.albertshih.org/"
                            className="hover:underline font-medium"
                            style={{ color: "var(--md-sys-color-primary)" }}
                          >
                            ozboosterpacks.albertshih.org
                          </a>
                        </>
                      ),
                    },
                    {
                      icon: <QrCode size={13} />,
                      label:
                        "Scan the QR code on the ZooCamp/TWG HQ whiteboard",
                    },
                    {
                      icon: <QrCode size={13} />,
                      label:
                        "Scan the QR code on the On-Grounds Corkboard (by desks)",
                    },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span
                        className="p-1 rounded-full mt-0.5 flex-shrink-0"
                        style={{
                          background: "var(--md-sys-color-primary-container)",
                          color: "var(--md-sys-color-on-primary-container)",
                        }}
                      >
                        {item.icon}
                      </span>
                      <span
                        className="text-body-medium"
                        style={{
                          color: "var(--md-sys-color-on-surface-variant)",
                        }}
                      >
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.section>

          {/* How-to guides */}
          <div className="grid md:grid-cols-2 gap-5">
            <motion.section variants={listItemVariants}>
              <div
                className="rounded-3xl p-6 border h-full"
                style={{
                  background: "var(--md-sys-color-surface)",
                  borderColor: "var(--md-sys-color-outline-variant)",
                }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <span
                    className="p-2 rounded-xl"
                    style={{
                      background: "var(--md-sys-color-secondary-container)",
                      color: "var(--md-sys-color-on-secondary-container)",
                    }}
                  >
                    <Play size={20} />
                  </span>
                  <h2
                    className="text-title-large"
                    style={{ color: "var(--md-sys-color-on-surface)" }}
                  >
                    Quick Start
                  </h2>
                </div>
                <ol className="space-y-3">
                  {[
                    "Navigate to the website",
                    'Press "Generate Booster Pack!" on the top left corner',
                    "Pull the cards specified from the Mint card box to make your booster pack",
                    "Check off cards as you create the pack",
                    "Repeat as desired",
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span
                        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-label-medium"
                        style={{
                          background: "var(--md-sys-color-secondary-container)",
                          color: "var(--md-sys-color-on-secondary-container)",
                        }}
                      >
                        {i + 1}
                      </span>
                      <span
                        className="text-body-medium"
                        style={{
                          color: "var(--md-sys-color-on-surface-variant)",
                        }}
                      >
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </motion.section>

            <motion.section variants={listItemVariants}>
              <div
                className="rounded-3xl p-6 border h-full"
                style={{
                  background: "var(--md-sys-color-surface)",
                  borderColor: "var(--md-sys-color-outline-variant)",
                }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <span
                    className="p-2 rounded-xl"
                    style={{
                      background: "var(--md-sys-color-tertiary-container)",
                      color: "var(--md-sys-color-on-tertiary-container)",
                    }}
                  >
                    <Layers size={20} />
                  </span>
                  <h2
                    className="text-title-large"
                    style={{ color: "var(--md-sys-color-on-surface)" }}
                  >
                    Multiple Packs
                  </h2>
                </div>
                <ol className="space-y-3">
                  {[
                    "Navigate to the website",
                    "Select from 5, 10, or 20 booster packs",
                    "Expand or close each pack as necessary",
                    "Pull the cards specified from the Mint card box",
                    "Check off cards as you create each pack",
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span
                        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-label-medium"
                        style={{
                          background: "var(--md-sys-color-tertiary-container)",
                          color: "var(--md-sys-color-on-tertiary-container)",
                        }}
                      >
                        {i + 1}
                      </span>
                      <span
                        className="text-body-medium"
                        style={{
                          color: "var(--md-sys-color-on-surface-variant)",
                        }}
                      >
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </motion.section>
          </div>

          {/* Editing card information */}
          <motion.section variants={listItemVariants}>
            <div
              className="rounded-3xl p-6 border"
              style={{
                background: "var(--md-sys-color-surface)",
                borderColor: "var(--md-sys-color-outline-variant)",
              }}
            >
              <div className="flex items-center gap-3 mb-5">
                <span
                  className="p-2 rounded-xl"
                  style={{
                    background: "var(--md-sys-color-error-container)",
                    color: "var(--md-sys-color-on-error-container)",
                  }}
                >
                  <ShieldAlert size={20} />
                </span>
                <h2
                  className="text-title-large"
                  style={{ color: "var(--md-sys-color-on-surface)" }}
                >
                  Editing Card Information
                </h2>
              </div>

              {/* Warning banner */}
              <div
                className="rounded-2xl p-4 flex gap-3 mb-5"
                style={{
                  background: "var(--md-sys-color-error-container)",
                  color: "var(--md-sys-color-on-error-container)",
                }}
              >
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-label-large">
                    IMPORTANT: Please only edit cards if you have explicit
                    permission from Patrick Wolff or an On-Grounds supervisor.
                  </p>
                </div>
              </div>

              <p
                className="text-body-medium mb-5"
                style={{ color: "var(--md-sys-color-on-surface-variant)" }}
              >
                <span
                  className="text-label-large"
                  style={{ color: "var(--md-sys-color-on-surface)" }}
                >
                  Access:
                </span>{" "}
                Click the &quot;Edit&quot; button in the top right of the
                screen. You will need to log in. Email{" "}
                <a
                  href="mailto:ashih@oaklandzoo.org"
                  className="hover:underline"
                  style={{ color: "var(--md-sys-color-primary)" }}
                >
                  ashih@oaklandzoo.org
                </a>{" "}
                for access.
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                {[
                  {
                    title: "Managing Cards",
                    items: [
                      "Toggle cards Active/Inactive (Active cards show up in the generator)",
                      "Edit card information (name, number, active status)",
                      "Delete cards (use only if approved by Patrick)",
                    ],
                  },
                  {
                    title: "Adding Cards",
                    preamble:
                      "Click the plus button to add a card. You'll need:",
                    items: [
                      "Card name",
                      "Card number",
                      'Zoo section (Australia cards are labeled as "Special Editions")',
                    ],
                  },
                ].map((card) => (
                  <div
                    key={card.title}
                    className="rounded-2xl p-4 border"
                    style={{
                      background: "var(--md-sys-color-surface-variant)",
                      borderColor: "var(--md-sys-color-outline-variant)",
                    }}
                  >
                    <h3
                      className="text-title-medium mb-3"
                      style={{ color: "var(--md-sys-color-on-surface)" }}
                    >
                      {card.title}
                    </h3>
                    {card.preamble && (
                      <p
                        className="text-body-medium mb-3"
                        style={{
                          color: "var(--md-sys-color-on-surface-variant)",
                        }}
                      >
                        {card.preamble}
                      </p>
                    )}
                    <ul className="space-y-2">
                      {card.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <div
                            className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                            style={{
                              background: "var(--md-sys-color-primary)",
                            }}
                          />
                          <span
                            className="text-body-medium"
                            style={{
                              color: "var(--md-sys-color-on-surface-variant)",
                            }}
                          >
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>

          {/* Need Help */}
          <motion.section variants={listItemVariants}>
            <div
              className="rounded-3xl p-6 border"
              style={{
                background: "var(--md-sys-color-surface)",
                borderColor: "var(--md-sys-color-outline-variant)",
              }}
            >
              <div className="flex items-center gap-3 mb-5">
                <span
                  className="p-2 rounded-xl"
                  style={{
                    background: "var(--md-sys-color-primary-container)",
                    color: "var(--md-sys-color-on-primary-container)",
                  }}
                >
                  <HelpCircle size={20} />
                </span>
                <h2
                  className="text-title-large"
                  style={{ color: "var(--md-sys-color-on-surface)" }}
                >
                  Need Help?
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {[
                  {
                    icon: <Mail size={16} />,
                    title: "App Support",
                    description:
                      "For questions about using the app or to report bugs, contact:",
                    name: "Albert Shih",
                    email: "ashih@oaklandzoo.org",
                  },
                  {
                    icon: <Info size={16} />,
                    title: "Program Information",
                    description:
                      "For questions about the Trading Card program or booster packs, contact:",
                    name: "Patrick Wolff",
                    email: "pwolff@oaklandzoo.org",
                  },
                ].map((contact) => (
                  <div
                    key={contact.title}
                    className="rounded-2xl p-4 border"
                    style={{
                      background: "var(--md-sys-color-surface-variant)",
                      borderColor: "var(--md-sys-color-outline-variant)",
                    }}
                  >
                    <h3
                      className="text-title-medium flex items-center gap-2 mb-2"
                      style={{ color: "var(--md-sys-color-on-surface)" }}
                    >
                      <span style={{ color: "var(--md-sys-color-primary)" }}>
                        {contact.icon}
                      </span>
                      {contact.title}
                    </h3>
                    <p
                      className="text-body-medium mb-3"
                      style={{
                        color: "var(--md-sys-color-on-surface-variant)",
                      }}
                    >
                      {contact.description}
                    </p>
                    <span
                      className="text-label-large block"
                      style={{ color: "var(--md-sys-color-on-surface)" }}
                    >
                      {contact.name}
                    </span>
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-body-medium hover:underline"
                      style={{ color: "var(--md-sys-color-primary)" }}
                    >
                      {contact.email}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>
        </motion.div>
      </motion.div>
    </DefaultLayout>
  );
}
