"use client";

import React, { useEffect, useState } from "react";

import { cn } from "@/lib/cn";

import { ModuleTabs, NavbarActions } from "./NavbarActions";
import { NavbarLogo } from "./NavbarLogo";

/**
 * Site header. `overlay` floats it over a full-bleed hero: transparent and
 * forced to the dark palette (light text on the photo) until the page
 * scrolls, then a blurred solid bar.
 */
const Navbar: React.FC<{ overlay?: boolean }> = ({ overlay = false }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  return (
    <header
      className={cn(
        "z-40 transition-[background-color,box-shadow,backdrop-filter] duration-300",
        overlay ? "fixed inset-x-0 top-0" : "relative bg-canvas",
        overlay && !scrolled && "dark bg-transparent",
        overlay && scrolled && "bg-canvas/80 shadow-[0_1px_0_var(--site-line)] backdrop-blur-xl",
      )}
    >
      <div className="relative mx-auto flex max-w-[1680px] items-center justify-between gap-3 px-4 py-3">
        <NavbarLogo />
        <ModuleTabs className="max-md:hidden absolute left-1/2 -translate-x-1/2" />
        <NavbarActions />
      </div>
      <div className="no-scrollbar overflow-x-auto px-4 pb-3 md:hidden">
        <ModuleTabs className="w-max" />
      </div>
    </header>
  );
};

export default Navbar;
