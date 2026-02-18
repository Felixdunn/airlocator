"use client";

import { useState } from "react";
import { AirdropCategory } from "@/lib/types/airdrop";
import { cn } from "@/lib/utils";
import { ChevronDown, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CategoryFilterProps {
  categories: Map<AirdropCategory, number>;
  selectedCategory?: AirdropCategory | "all";
  onCategoryChange: (category: AirdropCategory | "all") => void;
}

export function CategoryFilter({ categories, selectedCategory, onCategoryChange }: CategoryFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedLabel = selectedCategory === "all" 
    ? "All Categories" 
    : `${selectedCategory} (${categories.get(selectedCategory) || 0})`;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center space-x-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Filter className="h-4 w-4" />
        <span>{selectedLabel}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute left-0 mt-2 w-56 rounded-lg border border-border bg-popover p-2 shadow-lg z-20"
            >
              <button
                onClick={() => {
                  onCategoryChange("all");
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left rounded-md px-3 py-2 text-sm transition-colors",
                  selectedCategory === "all"
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                All Categories
              </button>
              
              {Array.from(categories.entries())
                .filter(([_, count]) => count > 0)
                .map(([category, count]) => (
                  <button
                    key={category}
                    onClick={() => {
                      onCategoryChange(category);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full text-left rounded-md px-3 py-2 text-sm transition-colors flex items-center justify-between",
                      selectedCategory === category
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <span>{category}</span>
                    <span className="text-muted-foreground text-xs">({count})</span>
                  </button>
                ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
