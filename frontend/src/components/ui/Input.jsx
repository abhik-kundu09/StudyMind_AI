import { forwardRef } from "react";
import { cn } from "../../utils/cn";

const Input = forwardRef(
  ({ label, error, icon: Icon, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium"
            style={{ color: "rgba(180,195,230,0.7)" }}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <span
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center"
              style={{ color: "rgba(212,168,86,0.4)" }}
            >
              <Icon className="h-4 w-4" />
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full rounded-xl border py-2.5 text-sm",
              "placeholder:text-[rgba(180,195,230,0.3)]",
              "transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-offset-0",
              "disabled:cursor-not-allowed disabled:opacity-50",
              Icon ? "pl-10 pr-4" : "px-4",
              className
            )}
            style={{
              background: "rgba(255,255,255,0.03)",
              color: "#E2E8F8",
              borderColor: error ? "rgba(248,113,113,0.5)" : "rgba(212,168,86,0.15)",
              "--tw-ring-color": error ? "rgba(248,113,113,0.4)" : "rgba(212,168,86,0.35)",
            }}
            onFocus={(e) => {
              if (!error) e.currentTarget.style.borderColor = "rgba(212,168,86,0.4)";
            }}
            onBlur={(e) => {
              if (!error) e.currentTarget.style.borderColor = "rgba(212,168,86,0.15)";
            }}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs" style={{ color: "#f87171" }} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;