import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import type { IconName } from "./Icon";
import { Icon } from "./Icon";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "ai";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "relative inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.96] select-none overflow-hidden";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-sm hover:from-primary-700 hover:to-ai-600 hover:shadow-[var(--shadow-interactive)] shine-parent",
  secondary:
    "bg-[#1e1f26] text-white border border-white/[0.1] hover:bg-white/[0.08] hover:border-white/[0.2] shadow-sm shine-parent",
  ghost: "text-[#94a3b8] hover:bg-white/[0.08] hover:text-white transition-colors",
  danger:
    "bg-danger-500 text-white hover:bg-danger-600 shadow-sm shine-parent",
  success:
    "bg-gradient-to-r from-success-500 to-success-600 text-white hover:from-success-600 hover:to-success-700 shadow-sm shine-parent",
  ai: "bg-gradient-to-r from-ai-600 to-primary-600 text-white shadow-sm hover:from-ai-700 hover:to-primary-700 hover:shadow-[var(--shadow-interactive)] shine-parent",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-6 text-[15px]",
  icon: "h-9 w-9",
};

type Props = {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, Props>(
  (
    {
      variant = "primary",
      size = "md",
      icon,
      iconRight,
      loading = false,
      disabled,
      children,
      className = "",
      ...rest
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...rest}
      >
        {loading ? (
          <span
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        ) : icon ? (
          <Icon name={icon} size={size === "sm" ? 13 : size === "lg" ? 17 : 15} />
        ) : null}
        {children}
        {iconRight && !loading ? (
          <Icon name={iconRight} size={size === "sm" ? 13 : size === "lg" ? 17 : 15} />
        ) : null}
      </button>
    );
  },
);
Button.displayName = "Button";
