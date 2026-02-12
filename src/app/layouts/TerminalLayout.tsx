import type { InfernoNode } from "inferno";

type TerminalLayoutProps = {
    children?: InfernoNode;
};

const getRandomNumber = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min;

const VERSION = String(getRandomNumber(34800, 34899));

export default function TerminalLayout({ children }: TerminalLayoutProps) {
    return (
        <div className="min-h-screen bg-black text-green-400 font-['Fira_Mono'] relative py-[24px]">
            
            <div className="h-[50px] w-full flex items-start relative bg-(image:--bg-terminal) font-[Oxanium] font-bold px-4  mb-[20px]">
                <div className="w-[5px] h-[25px] bg-cyan-300/70 mr-[2px]"></div>
                <div className="w-[3px] h-full bg-cyan-300/70 mr-[7px]"></div>
                <h3 className="text-xs text-cyan-200 mt-[3px]">DEBUG CONSOLE <span className="text-cyan-300/60 block">[ENABLED]</span></h3>

                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className="ml-auto h-[32px] pt-[4px] mr-[4px]">
                    <circle cx="100" cy="100" r="90" fill="none" stroke="#79cfe6" stroke-width="14" />
                    <circle cx="158.00" cy="100.00" r="14" fill="#79cfe6" />
                    <circle cx="129.00" cy="150.23" r="14" fill="#79cfe6" />
                    <circle cx="71.00" cy="150.23" r="14" fill="#79cfe6" />
                    <circle cx="42.00" cy="100.00" r="14" fill="#79cfe6" />
                    <circle cx="71.00" cy="49.77" r="14" fill="#79cfe6" />
                    <circle cx="129.00" cy="49.77" r="14" fill="#79cfe6" />
                </svg>
                <div className="w-[10px] h-[10px] bg-[#79cfe6] mr-[1px] mt-[4px] animate-pulse" style={{ "clip-path": "polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)" }}></div>
                <div className="w-[10px] h-[10px] bg-[#79cfe6] mr-[12px] mt-[4px] animate-pulse" style={{ "clip-path": "polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)" }}></div>
                <hr className="w-[3px] h-[40px] bg-cyan-300/70"/>
                <h3 className="text-xs text-cyan-200 mt-[3px] ml-[5px]">LOGGING <span className="block">ENABLED</span></h3>
            </div>        
            {children}
            <div className="fixed bottom-0 left-0 right-0 bg-black/70 border-t border-cyan-300/20 px-4 py-3 text-xs items-center justify-between text-cyan-200/80 hidden sm:flex font-[Oxanium] font-bold">
                <div className="">Inspired by GTFO. GTFO © 10 Chambers. Unofficial fan project; not affiliated with or endorsed by 10 Chambers.</div>
                <div className="">CORTEX NI v1.0 <span className="animation-pulse">▎</span> R:L0 {VERSION}</div>
            </div>
            
        </div>
    );
}
