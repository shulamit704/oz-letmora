import { cn } from "../lib/utils.js";

function Avatar({ name, size = "md" }) {
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("");
  const sizes = { sm: "w-9 h-9 text-xs", md: "w-10 h-10 text-sm", lg: "w-12 h-12 text-base" };
  return (
    <div className={cn("rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold flex items-center justify-center shrink-0 shadow-sm", sizes[size])}>
      {initials}
    </div>
  );
}

export { Avatar };
