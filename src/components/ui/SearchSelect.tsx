"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";

export interface SearchSelectOption {
  value: string;
  /** Primary text — also what typing filters against. */
  label: string;
  /** Optional leading glyph (flag emoji, icon). */
  prefix?: ReactNode;
  /** Muted text on the right (offset, code). */
  hint?: string;
  /** Extra text to match on that isn't shown, e.g. an ISO code. */
  keywords?: string;
}

/**
 * Dropdown with a type-to-filter box, for lists too long to scan by eye
 * (countries, time zones). Styled to match the app's inputs and menus.
 */
export function SearchSelect({
  value,
  options,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No matches",
  disabled = false,
  ariaLabel,
}: {
  value: string;
  options: SearchSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      // Let the portal mount before stealing focus.
      const id = requestAnimationFrame(() => searchRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.hint?.toLowerCase().includes(q) ||
        o.keywords?.toLowerCase().includes(q)
    );
  }, [options, query]);

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      matchTriggerSize
      trigger={
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel}
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-lg border border-edge bg-surface-sunken px-3 text-left text-[13.5px] text-ink outline-none transition-colors duration-150",
            disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer",
            open && "border-primary"
          )}
        >
          {selected?.prefix}
          <span className={cn("min-w-0 flex-1 truncate", !selected && "text-ink-faint")}>
            {selected?.label ?? placeholder}
          </span>
          {selected?.hint && (
            <span className="shrink-0 text-[12px] text-ink-faint">{selected.hint}</span>
          )}
          <ChevronDown
            size={15}
            className={cn(
              "shrink-0 text-ink-faint transition-transform duration-150",
              open && "rotate-180"
            )}
          />
        </button>
      }
    >
      {(close) => (
        <div>
          <div className="relative mb-1">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filtered.length > 0) {
                  onChange(filtered[0].value);
                  close();
                }
              }}
              placeholder={searchPlaceholder}
              className="h-9 w-full rounded-md border border-edge bg-surface-sunken pl-8 pr-2.5 text-[13px] text-ink outline-none transition-colors duration-150 placeholder:text-ink-faint focus:border-primary"
            />
          </div>
          <div className="nice-scroll max-h-[240px] overflow-y-auto" role="listbox">
            {filtered.length === 0 ? (
              <p className="px-2.5 py-3 text-center text-[12.5px] text-ink-faint">{emptyText}</p>
            ) : (
              filtered.map((o) => (
                <DropdownItem
                  key={o.value}
                  active={o.value === value}
                  onClick={() => {
                    onChange(o.value);
                    close();
                  }}
                >
                  {o.prefix}
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.hint && (
                    <span className="shrink-0 text-[11.5px] text-ink-faint">{o.hint}</span>
                  )}
                  {o.value === value && <Check size={14} className="shrink-0 text-primary" />}
                </DropdownItem>
              ))
            )}
          </div>
        </div>
      )}
    </Dropdown>
  );
}
