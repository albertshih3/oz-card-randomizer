import { useState } from "react";
import { Link } from "@heroui/link";
import {
  Navbar as HeroUINavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
} from "@heroui/navbar";
import { link as linkStyles } from "@heroui/theme";
import clsx from "clsx";
import { useNavigate } from "react-router-dom";

import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import { SignedOut, SignedIn, UserButton } from "@clerk/clerk-react";
import { M3Button } from "@/components/m3/button";
import { FeedbackDialog } from "@/components/feedback-dialog";
import { event } from "@/lib/gtag";

export const Navbar = () => {
  const navigate = useNavigate();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const handleNavClick = (label: string) => {
    event("select_content", {
      content_type: "navigation",
      item_id: `nav_${label.toLowerCase()}`,
    });
  };

  const handleAuthClick = (action: "sign_in" | "sign_out") => {
    event("select_content", {
      content_type: "authentication",
      item_id: action,
    });
  };

  return (
    <>
      <HeroUINavbar
        maxWidth="xl"
        position="sticky"
        height="4.75rem"
        className="border-b border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)]/95 backdrop-blur"
      >
        <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
          <NavbarBrand className="gap-3 max-w-fit">
            <Link
              className="flex items-center justify-start gap-3"
              color="foreground"
              href="/"
            >
              <img
                src="/csclogo.svg"
                alt="Booster Pack Creator"
                className="h-10 w-auto"
              />
            </Link>
          </NavbarBrand>
          <div className="ml-8 hidden justify-start gap-5 md:flex">
            {siteConfig.navItems.map((item) => (
              <NavbarItem key={item.href}>
                <Link
                  className={clsx(
                    linkStyles({ color: "foreground" }),
                    "text-label-large text-[var(--md-sys-color-on-surface-variant)] transition-colors hover:text-[var(--md-sys-color-primary)] data-[active=true]:text-[var(--md-sys-color-primary)]",
                  )}
                  color="foreground"
                  href={item.href}
                  onPress={() => handleNavClick(item.label)}
                >
                  {item.label}
                </Link>
              </NavbarItem>
            ))}
            <SignedIn>
              <NavbarItem>
                <Link
                  className={clsx(
                    linkStyles({ color: "foreground" }),
                    "text-label-large text-[var(--md-sys-color-on-surface-variant)] transition-colors hover:text-[var(--md-sys-color-primary)] data-[active=true]:text-[var(--md-sys-color-primary)]",
                  )}
                  color="foreground"
                  href="/admin"
                  onPress={() => handleNavClick("Admin")}
                >
                  Admin
                </Link>
              </NavbarItem>
            </SignedIn>
          </div>
        </NavbarContent>

        <NavbarContent
          className="hidden sm:flex basis-1/5 sm:basis-full"
          justify="end"
        >
          <NavbarItem className="hidden md:flex">
            <M3Button
              variant="text"
              size="sm"
              onPress={() => setFeedbackOpen(true)}
              className="text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-primary)]"
            >
              Feedback
            </M3Button>
          </NavbarItem>
          <NavbarItem className="hidden sm:flex gap-2">
            <ThemeSwitch />
          </NavbarItem>
          <NavbarItem className="hidden md:flex">
            <SignedOut>
              <M3Button
                variant="tonal"
                className="bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]"
                onPress={() => {
                  handleAuthClick("sign_in");
                  navigate("/sign-in");
                }}
              >
                Sign In
              </M3Button>
            </SignedOut>
            <SignedIn>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9 border-2 border-primary/20",
                  },
                }}
              />
            </SignedIn>
          </NavbarItem>
        </NavbarContent>

        <NavbarContent className="sm:hidden basis-1 pl-4" justify="end">
          <ThemeSwitch />
          <NavbarMenuToggle />
        </NavbarContent>

        <NavbarMenu>
          <div className="mx-4 mt-6 flex flex-col gap-4">
            {siteConfig.navMenuItems.map((item) => (
              <NavbarMenuItem key={item.href}>
                <Link
                  color="foreground"
                  href={item.href}
                  size="lg"
                  className="text-title-medium"
                  onPress={() => handleNavClick(item.label)}
                >
                  {item.label}
                </Link>
              </NavbarMenuItem>
            ))}
            <SignedIn>
              <NavbarMenuItem>
                <Link
                  color="foreground"
                  href="/admin"
                  size="lg"
                  className="text-title-medium"
                  onPress={() => handleNavClick("Admin")}
                >
                  Admin
                </Link>
              </NavbarMenuItem>
            </SignedIn>
          </div>
          <div className="mx-4 mt-6 flex flex-col gap-2">
            <M3Button
              variant="outlined"
              className="w-full"
              onPress={() => setFeedbackOpen(true)}
            >
              Submit Feedback
            </M3Button>
            <SignedOut>
              <M3Button
                variant="filled"
                className="w-full"
                onPress={() => {
                  handleAuthClick("sign_in");
                  navigate("/sign-in");
                }}
              >
                Sign In
              </M3Button>
            </SignedOut>
            <SignedIn>
              <div className="flex items-center gap-4 p-2">
                <UserButton />
                <span className="text-label-large">Account</span>
              </div>
            </SignedIn>
          </div>
        </NavbarMenu>
      </HeroUINavbar>

      <FeedbackDialog
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
    </>
  );
};
