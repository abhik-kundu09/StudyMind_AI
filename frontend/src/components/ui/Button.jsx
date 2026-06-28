import { forwardRef } from "react";
import { cn } from "../../utils/cn";

// Noir Gold variant styles. Hex values match the chat UI components
// (ChatSidebar.jsx, ChatInput.jsx) directly rather than Tailwind's @theme
// tokens, since that's the convention actually in use across the app.
const variants = {
  primary:
    "text-[#0A0908] hover:brightness-110 focus-visible:ring-[#D4A856]/50 disabled:opacity-50 disabled:hover:brightness-100",
  secondary:
    "bg-white/[0.03] text-[#E2E8F8] border border-[rgba(212,168,86,0.18)] hover:bg-[rgba(212,168,86,0.08)] hover:border-[rgba(212,168,86,0.35)] focus-visible:ring-[#D4A856]/30",
  ghost:
    "text-[rgba(180,195,230,0.5)] hover:text-[#D4A856] hover:bg-[rgba(212,168,86,0.06)] focus-visible:ring-[rgba(212,168,86,0.2)]",
  danger:
    "bg-red-600/80 text-white hover:bg-red-500 focus-visible:ring-red-500",
};

// primary uses a gradient background that can't be expressed as a plain
// Tailwind class without arbitrary-value gradients getting unwieldy —
// applied via inline style instead, same pattern as ChatSidebar's "New Chat"
// button and the avatar badges across the chat components.
const PRIMARY_GRADIENT = "linear-gradient(135deg, #D4A856, #E8B894)";

const sizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

const Button = forwardRef(
  (
    {
      children,
      variant = "primary",
      size = "md",
      className,
      isLoading = false,
      disabled,
      style,
      ...props
    },
    ref
  ) => {
    const isPrimary = variant === "primary";

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-medium",
          "transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0908]",
          "disabled:cursor-not-allowed disabled:opacity-60",
          variants[variant],
          sizes[size],
          className
        )}
        style={isPrimary ? { background: PRIMARY_GRADIENT, ...style } : style}
        {...props}
      >
        {isLoading && (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;