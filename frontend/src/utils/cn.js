// Lightweight className merger — avoids clsx/twMerge dependency for now.
// If you add tailwind-merge later, replace this body with: twMerge(clsx(...inputs))
export function cn(...inputs) {
  return inputs
    .flat()
    .filter((x) => typeof x === "string" && x)
    .join(" ");
}