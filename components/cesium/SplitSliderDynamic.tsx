"use client";

import dynamic from "next/dynamic";

const SplitSlider = dynamic(() => import("./SplitSlider"), {
  ssr: false,
});

export default SplitSlider;
