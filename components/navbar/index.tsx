import React from "react";

import { NavbarActions } from "./NavbarActions";
import { NavbarLogo } from "./NavbarLogo";

const Navbar: React.FC = () => {
  return (
    <div className="sticky flex items-center justify-between px-6 py-3 bg-background dark:bg-[#1E3A5F] shadow-[0px_1px_2px_-1px_#0000001A,0px_1px_3px_0px_#0000001A] z-10">
      <NavbarLogo />
      <NavbarActions />
    </div>
  );
};

export default Navbar;
