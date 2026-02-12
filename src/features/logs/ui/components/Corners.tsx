export function Corners(){
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <span className="absolute top-0 left-0 w-[20px] h-[20px] border-t-[5px] border-l-[5px] border-cyan-300/60"></span>
      <span className="absolute top-0 right-0 w-[20px] h-[20px] border-t-[5px] border-r-[5px] border-cyan-300/60"></span>
      <span className="absolute bottom-0 left-0 w-[20px] h-[20px] border-b-[5px] border-l-[5px] border-cyan-300/60"></span>
      <span className="absolute bottom-0 right-0 w-[20px] h-[20px] border-b-[5px] border-r-[5px] border-cyan-300/60"></span>
    </div>
  );
}