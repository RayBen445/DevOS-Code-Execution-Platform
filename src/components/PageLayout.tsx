import { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import MobileBottomNav from "./MobileBottomNav";
import { cn } from "../lib/utils";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
  showFooter?: boolean;
  navbarProps?: {
    onSignIn?: () => void;
  };
}

/**
 * Shared layout wrapper used by all public pages.
 * Renders: Header (Navbar) → main content → Footer + MobileBottomNav
 */
export default function PageLayout({
  children,
  className,
  showFooter = true,
  navbarProps,
}: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-base text-white flex flex-col">
      <Navbar {...navbarProps} />
      <main className={cn("flex-1 pb-16 md:pb-0", className)}>{children}</main>
      {showFooter && <Footer />}
      <MobileBottomNav />
    </div>
  );
}
