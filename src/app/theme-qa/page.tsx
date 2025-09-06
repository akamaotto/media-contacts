"use client";

import * as React from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Label } from "@/components/ui/label";

export default function ThemeQA() {
  const [selectValue, setSelectValue] = React.useState<string>("option-1");
  const [menuView, setMenuView] = React.useState<string>("list");
  const [checks, setChecks] = React.useState<{ book: boolean; music: boolean; film: boolean }>({
    book: true,
    music: false,
    film: true,
  });

  const msOptions: MultiSelectOption[] = Array.from({ length: 20 }).map((_, i) => ({
    value: `opt-${i + 1}`,
    label: `Option ${i + 1}`,
  }));
  const [msSelected, setMsSelected] = React.useState<string[]>(["opt-2", "opt-5"]);

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Theme QA</h1>
          <p className="text-muted-foreground">Validate pastel tokens, overlays, and focus behavior</p>
        </div>
        <ThemeToggle />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Select</CardTitle>
            <CardDescription>Radix Select with portal + popper and scroll buttons</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default</Label>
              <Select value={selectValue} onValueChange={setSelectValue}>
                <SelectTrigger className="w-60">
                  <SelectValue placeholder="Choose an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Group A</SelectLabel>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <SelectItem key={`a-${i}`} value={`option-${i + 1}`}>{`Option ${i + 1}`}</SelectItem>
                    ))}
                    <SelectSeparator />
                    <SelectLabel>Group B</SelectLabel>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <SelectItem key={`b-${i}`} value={`b-${i + 1}`}>{`Item ${i + 1}`}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Inside clipped container (tests portal + z-index)</Label>
              <div className="h-24 w-full overflow-hidden rounded-md border bg-card p-4">
                <div className="h-28 w-max">
                  <Select defaultValue="inside-1">
                    <SelectTrigger className="w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inside-1">Inside 1</SelectItem>
                      <SelectItem value="inside-2">Inside 2</SelectItem>
                      <SelectItem value="inside-3">Inside 3</SelectItem>
                      <SelectItem value="inside-4">Inside 4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Combobox (MultiSelect)</CardTitle>
            <CardDescription>Popover + Command based MultiSelect</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <MultiSelect
              options={msOptions}
              selected={msSelected}
              onChange={setMsSelected}
              placeholder="Pick multiple options"
            />
            <p className="text-xs text-muted-foreground">Selected: {msSelected.join(", ") || "none"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dropdown Menu</CardTitle>
            <CardDescription>Portal + popper with radio and checkbox items</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Open menu</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start">
                <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => alert("Clicked: New")}>New</DropdownMenuItem>
                <DropdownMenuItem onClick={() => alert("Clicked: Duplicate")}>Duplicate</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>View</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={menuView} onValueChange={setMenuView}>
                  <DropdownMenuRadioItem value="list">List</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="grid">Grid</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="detail">Detail</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Filters</DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={checks.book}
                  onCheckedChange={(v) => setChecks((c) => ({ ...c, book: Boolean(v) }))}
                >
                  Books
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={checks.music}
                  onCheckedChange={(v) => setChecks((c) => ({ ...c, music: Boolean(v) }))}
                >
                  Music
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={checks.film}
                  onCheckedChange={(v) => setChecks((c) => ({ ...c, film: Boolean(v) }))}
                >
                  Film
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>Archive</DropdownMenuItem>
                    <DropdownMenuItem>Move</DropdownMenuItem>
                    <DropdownMenuItem>Share</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Popover</CardTitle>
            <CardDescription>Simple content popover</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Toggle popover</Button>
              </PopoverTrigger>
              <PopoverContent align="start">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Popover title</h4>
                  <p className="text-sm text-muted-foreground">Tokenized background, border, and shadow.</p>
                  <Button size="sm">Action</Button>
                </div>
              </PopoverContent>
            </Popover>

            <div className="space-y-2">
              <Label>Inside fixed-height container (portal test)</Label>
              <div className="h-24 overflow-hidden rounded-md border bg-card p-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="secondary" size="sm">Open inside</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64" align="start">
                    This popover should render above despite container clipping, thanks to the Radix portal.
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pagination</CardTitle>
            <CardDescription>Tokenized links and states</CardDescription>
          </CardHeader>
          <CardContent>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#">1</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink isActive href="#">
                    2
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#">3</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext href="#" />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Color Tokens</CardTitle>
          <CardDescription>Quick visual of background/foreground and accents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Swatch name="Background" className="bg-background border" />
            <Swatch name="Foreground" className="bg-foreground" textMuted />
            <Swatch name="Primary" className="bg-primary" textOn="text-primary-foreground" />
            <Swatch name="Secondary" className="bg-secondary" textOn="text-secondary-foreground" />
            <Swatch name="Accent" className="bg-accent" textOn="text-accent-foreground" />
            <Swatch name="Destructive" className="bg-destructive" textOn="text-destructive-foreground" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Swatch({ name, className, textOn, textMuted }: { name: string; className: string; textOn?: string; textMuted?: boolean }) {
  return (
    <div className="space-y-2">
      <div className={`h-10 w-full rounded ${className}`} />
      <p className={`text-xs text-center ${textOn ? textOn : textMuted ? "text-muted-foreground" : ""}`}>{name}</p>
    </div>
  );
}
