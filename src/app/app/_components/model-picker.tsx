"use client";

import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getModel, models, setModel, useModel, type ModelId } from "../_lib/models";

export function ModelPicker() {
  const current = getModel(useModel());

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Model: ${current.name}`}
        className="flex h-9 items-center gap-1 rounded-xl px-3 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=open]:bg-muted data-[state=open]:text-foreground"
      >
        {current.name}
        <ChevronDown className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-72 rounded-2xl p-1.5">
        <DropdownMenuRadioGroup value={current.id} onValueChange={(value) => setModel(value as ModelId)}>
          {models.map((model) => (
            <DropdownMenuRadioItem
              key={model.id}
              value={model.id}
              className="flex-col items-start gap-0.5 rounded-xl py-2 pr-9 pl-3 [&_[data-slot=dropdown-menu-radio-item-indicator]]:inset-y-0 [&_[data-slot=dropdown-menu-radio-item-indicator]]:right-3"
            >
              <span className="font-medium">{model.name}</span>
              <span className="text-xs text-muted-foreground">{model.description}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
