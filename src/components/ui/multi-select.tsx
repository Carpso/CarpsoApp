// src/components/ui/multi-select.tsx
"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type OptionType = {
  label: string;
  value: string;
};

interface MultiSelectProps {
  options: OptionType[];
  selected: string[];
  onChange: React.Dispatch<React.SetStateAction<string[]>>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const MultiSelect = React.forwardRef<HTMLButtonElement, MultiSelectProps>(
  ({ options, selected, onChange, placeholder = "Select options...", className, disabled = false, ...props }, ref) => {
    const [open, setOpen] = React.useState(false);

    const handleUnselect = (item: string) => {
      onChange(selected.filter((i) => i !== item));
    };

    return (
      <Popover open={open} onOpenChange={setOpen} >
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between", selected.length > 0 ? "h-full" : "h-10", className)}
            onClick={() => setOpen(!open)}
            disabled={disabled}
            {...props}
          >
            <div className="flex flex-wrap gap-1">
              {selected.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
              {selected.map((item) => {
                  const option = options.find(opt => opt.value === item);
                  return (
                        <Badge
                          variant="secondary"
                          key={item}
                          className="mr-1 mb-1"
                          onClick={(e) => {
                             e.stopPropagation(); // Prevent popover from closing
                             handleUnselect(item);
                          }}
                        >
                          {option?.label || item}
                          <button
                            className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleUnselect(item);
                              }
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onClick={() => handleUnselect(item)}
                            aria-label={`Remove ${option?.label || item}`}
                          >
                            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                          </button>
                        </Badge>
                  );
              })}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command className={className}>
            <CommandInput placeholder="Search ..." />
            <CommandList>
                <CommandEmpty>No item found.</CommandEmpty>
                <CommandGroup className="max-h-64 overflow-auto">
                {options.map((option) => (
                    <CommandItem
                    key={option.value}
                    onSelect={() => {
                        onChange(
                        selected.includes(option.value)
                            ? selected.filter((item) => item !== option.value)
                            : [...selected, option.value]
                        );
                        setOpen(true); // Keep open after selection
                    }}
                    >
                    <Check
                        className={cn(
                        "mr-2 h-4 w-4",
                        selected.includes(option.value) ? "opacity-100" : "opacity-0"
                        )}
                    />
                    {option.label}
                    </CommandItem>
                ))}
                </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);

MultiSelect.displayName = "MultiSelect";

export { MultiSelect };
