"use client";

import { useState } from "react";

import { EarthIcon } from "../../icons";
import SectionHeader from "../../section-header";

const ResearchInfo = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <section id="research-info" className="flex flex-col gap-2">
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="cursor-pointer select-none"
            >
                <SectionHeader
                    name="Research Info"
                    icon={
                        <EarthIcon className="w-3 h-3 text-slate-500 dark:text-[#90A1B9]" />
                    }
                />
            </div>

            {isOpen && (
                <div className="text-xs text-slate-600 dark:text-slate-400 flex flex-col gap-2 pl-1">
                    <p className="font-medium text-slate-700 dark:text-slate-200">
                        Volcano Digital Twin Platform
                    </p>

                    <p>
                        Developed by Geo-AIT Research Team <br />
                        Dept Teknik Geodesi FT UGM
                    </p>

                    <div>
                        <p className="font-medium">Available datasets:</p>
                        <ul className="list-disc ml-4">
                            <li>Mt Agung, Bali (6 epochs)</li>
                            <li>Mt Kelud (2 epochs)</li>
                        </ul>
                    </div>

                    <p>DTM & orthophoto derived from UAV imagery</p>

                    <p>
                        Contact:{" "}
                        <a
                            href="mailto:ruliandaru@ugm.ac.id"
                            className="underline hover:text-blue-500"
                        >
                            ruliandaru@ugm.ac.id
                        </a>
                    </p>
                </div>
            )}
        </section>
    );
};

export default ResearchInfo;