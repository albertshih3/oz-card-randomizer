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
import { SignInButton, SignedOut, SignedIn, UserButton, SignOutButton } from "@clerk/clerk-react";
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
    <HeroUINavbar maxWidth="xl" position="sticky">
      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
        <NavbarBrand className="gap-3 max-w-fit">
            <Link
            className="flex justify-start items-center gap-1"
            color="foreground"
            href="/"
            >
            <img src="/csclogo.svg" alt="Booster Pack Creator" className="hidden sm:block" />
            <p className="font-bold text-inherit">Booster Pack Creator</p>
            </Link>
        </NavbarBrand>
        <div className="hidden md:flex gap-4 justify-start ml-48">
          {siteConfig.navItems.map((item) => (
            <NavbarItem key={item.href}>
              <Link
                className={clsx(
                  linkStyles({ color: "foreground" }),
                  "data-[active=true]:text-primary data-[active=true]:font-medium"
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
          <Button
            isExternal
            as={Link}
            className="text-sm font-normal text-default-600 bg-default-100"
            variant="flat"
          >
            <SignedOut>
              <SignInButton />
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </Button>
        </NavbarItem>
      </NavbarContent>

      <NavbarContent className="sm:hidden basis-1 pl-4" justify="end">
        <ThemeSwitch />
        <NavbarMenuToggle />
      </NavbarContent>

      <NavbarMenu>
        <div className="mx-4 mt-2 flex flex-col gap-2">
          {siteConfig.navMenuItems.map((item, index) => (
            <NavbarMenuItem key={`${item}-${index}`}>
              <Link
                color="foreground"
                href={item.href}
                size="lg"
                onPress={() => handleNavClick(item.label)}
              >
                {item.label}
              </Link>
            </NavbarMenuItem>
          ))}
        </div>
        <div className="mx-4 mt-2 flex flex-col gap-2">

          <SignedOut>
            <SignInButton>
              <Button
                className="text-md font-bold text-default-1000 bg-default-100"
                color="primary"
                variant="flat"
                onPress={() => handleAuthClick('sign_in')}
              >
                Sign In </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <SignOutButton redirectUrl="/" />
          </SignedIn>
        </div>
      </NavbarMenu>
    </HeroUINavbar>
  );
};
