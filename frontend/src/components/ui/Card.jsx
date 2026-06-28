import { cn } from "../../utils/cn";

// Noir Gold glassmorphic card — matches UIDESIGN.md §2.A "Glassmorphic Card
// Container" spec: dark panel background, gold-tinted border, hover glow.
export default function Card({ children, className, hoverable = false, ...props }) {
  return (
    <div
      className={cn(
        "rounded-2xl backdrop-blur-md transition-all duration-300",
        hoverable && "cursor-pointer",
        className
      )}
      style={{
        background: "rgba(20, 17, 12, 0.7)",
        border: "1px solid rgba(212, 168, 86, 0.15)",
      }}
      onMouseEnter={
        hoverable
          ? (e) => {
              e.currentTarget.style.borderColor = "rgba(212,168,86,0.4)";
              e.currentTarget.style.boxShadow = "0 0 25px rgba(212,168,86,0.1)";
            }
          : undefined
      }
      onMouseLeave={
        hoverable
          ? (e) => {
              e.currentTarget.style.borderColor = "rgba(212,168,86,0.15)";
              e.currentTarget.style.boxShadow = "none";
            }
          : undefined
      }
      {...props}
    >
      {children}
    </div>
  );
}