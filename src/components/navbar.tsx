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

import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import { SignInButton, SignedOut, SignedIn, UserButton } from "@clerk/clerk-react";
import { Button } from "@heroui/button";
import { useAnalytics } from "@/hooks/use-analytics";

export const Navbar = () => {
  const { trackEvent } = useAnalytics();

  const handleNavClick = (label: string) => {
    trackEvent('click', 'navigation', `nav_${label.toLowerCase()}`);
  };

  const handleAuthClick = (action: 'sign_in' | 'sign_out') => {
    trackEvent('click', 'authentication', action);
  };

  return (
    <HeroUINavbar
      maxWidth="xl"
      position="sticky"
      height="7rem"
      className="backdrop-blur-md bg-background/70 border-b border-default-100"
    >
      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
        <NavbarBrand className="gap-3 max-w-fit">
          <Link
            className="flex justify-start items-center gap-6"
            color="foreground"
            href="/"
          >
            <img src="/csclogo.svg" alt="Booster Pack Creator" className="h-12 w-auto" />
          </Link>
        </NavbarBrand>
        <div className="hidden md:flex gap-6 justify-start ml-12">
          {siteConfig.navItems.map((item) => (
            <NavbarItem key={item.href}>
              <Link
                className={clsx(
                  linkStyles({ color: "foreground" }),
                  "data-[active=true]:text-primary data-[active=true]:font-medium text-sm font-medium transition-colors hover:text-primary"
                )}
                color="foreground"
                href={item.href}
                onPress={() => handleNavClick(item.label)}
              >
                {item.label}
              </Link>
            </NavbarItem>
          ))}
        </div>
      </NavbarContent>

      <NavbarContent
        className="hidden sm:flex basis-1/5 sm:basis-full"
        justify="end"
      >
        <NavbarItem className="hidden sm:flex gap-2">
          <ThemeSwitch />
        </NavbarItem>
        <NavbarItem className="hidden md:flex">
          <SignedOut>
            <SignInButton>
              <Button
                className="text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20"
                variant="flat"
                radius="full"
                onPress={() => handleAuthClick('sign_in')}
              >
                Sign In
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9 border-2 border-primary/20"
                }
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
          {siteConfig.navMenuItems.map((item, index) => (
            <NavbarMenuItem key={`${item}-${index}`}>
              <Link
                color="foreground"
                href={item.href}
                size="lg"
                className="font-medium"
                onPress={() => handleNavClick(item.label)}
              >
                {item.label}
              </Link>
            </NavbarMenuItem>
          ))}
        </div>
        <div className="mx-4 mt-6 flex flex-col gap-2">
          <SignedOut>
            <SignInButton>
              <Button
                className="w-full font-bold"
                color="primary"
                variant="shadow"
                onPress={() => handleAuthClick('sign_in')}
              >
                Sign In
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <div className="flex items-center gap-4 p-2">
              <UserButton />
              <span className="text-sm font-medium">Account</span>
            </div>
          </SignedIn>
        </div>
      </NavbarMenu>
    </HeroUINavbar>
  );
};
