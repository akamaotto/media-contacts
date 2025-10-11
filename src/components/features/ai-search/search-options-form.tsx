"use client";

import * as React from "react";
import { useCallback, useState } from "react";
import { Settings, Sliders } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { SearchOptionsFormProps, SearchOptions } from "./types";

export function SearchOptionsForm({
  value,
  onChange,
  disabled = false,
  className
}: SearchOptionsFormProps) {
  const [open, setOpen] = useState(false);

  const handleChange = useCallback(
    (key: keyof SearchOptions, newValue: any) => {
      onChange({
        ...value,
        [key]: newValue
      });
    },
    [onChange, value]
  );

  const handleCsvField = useCallback(
    (key: "languages" | "regions" | "outlets", csv: string) => {
      const items = csv
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      handleChange(key, items);
    },
    [handleChange]
  );

  const reset = useCallback(() => {
    onChange({
      maxQueries: 10,
      diversityThreshold: 0.7,
      minRelevanceScore: 0.3,
      enableAIEnhancement: true,
      fallbackStrategies: true,
      cacheEnabled: true,
      priority: "medium"
    });
  }, [onChange]);

  return (
    <Card
      className={cn(
        "rounded-2xl border border-border/60 bg-background/80 dark:bg-muted/40",
        className
      )}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Settings className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Advanced settings</CardTitle>
                <CardDescription className="text-xs">
                  Optional knobs for power users. Leave closed to keep defaults.
                </CardDescription>
              </div>
            </div>
            <Sliders
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                open && "rotate-180 text-primary"
              )}
            />
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-5 px-5 pb-5 pt-0">
            <div className="space-y-4">
              <Label htmlFor="maxQueries">Maximum AI queries</Label>
              <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-background px-4 py-3">
                <Slider
                  id="maxQueries"
                  min={1}
                  max={50}
                  step={1}
                  disabled={disabled}
                  value={[value.maxQueries || 10]}
                  onValueChange={([count]) => handleChange("maxQueries", count)}
                />
                <Input
                  type="number"
                  min={1}
                  max={50}
                  disabled={disabled}
                  value={value.maxQueries || 10}
                  onChange={(event) =>
                    handleChange("maxQueries", parseInt(event.target.value, 10) || 10)
                  }
                  className="w-24"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Processing priority</Label>
              <Select
                value={value.priority || "medium"}
                onValueChange={(priority: "low" | "medium" | "high") =>
                  handleChange("priority", priority)
                }
                disabled={disabled}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Processing priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low · slower / fewer credits</SelectItem>
                  <SelectItem value="medium">Medium · balanced</SelectItem>
                  <SelectItem value="high">High · fastest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Diversity threshold</Label>
              <Slider
                min={0}
                max={1}
                step={0.1}
                disabled={disabled}
                value={[value.diversityThreshold || 0.7]}
                onValueChange={([score]) => handleChange("diversityThreshold", score)}
              />
            </div>

            <div className="space-y-3">
              <Label>Minimum relevance</Label>
              <Slider
                min={0}
                max={1}
                step={0.1}
                disabled={disabled}
                value={[value.minRelevanceScore || 0.3]}
                onValueChange={([score]) => handleChange("minRelevanceScore", score)}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background px-3 py-2">
                <div className="text-sm">AI enhancement</div>
                <Switch
                  checked={value.enableAIEnhancement ?? true}
                  onCheckedChange={(checked) => handleChange("enableAIEnhancement", checked)}
                  disabled={disabled}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background px-3 py-2">
                <div className="text-sm">Fallback strategies</div>
                <Switch
                  checked={value.fallbackStrategies ?? true}
                  onCheckedChange={(checked) => handleChange("fallbackStrategies", checked)}
                  disabled={disabled}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background px-3 py-2">
                <div className="text-sm">Cache recent results</div>
                <Switch
                  checked={value.cacheEnabled ?? true}
                  onCheckedChange={(checked) => handleChange("cacheEnabled", checked)}
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Preferred languages</Label>
              <Input
                placeholder="Comma separated e.g. English, French"
                disabled={disabled}
                value={(value.languages || []).join(", ")}
                onChange={(event) => handleCsvField("languages", event.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label>Preferred regions</Label>
              <Input
                placeholder="Comma separated e.g. EMEA, LATAM"
                disabled={disabled}
                value={(value.regions || []).join(", ")}
                onChange={(event) => handleCsvField("regions", event.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label>Preferred outlets</Label>
              <Input
                placeholder="Comma separated domains or names"
                disabled={disabled}
                value={(value.outlets || []).join(", ")}
                onChange={(event) => handleCsvField("outlets", event.target.value)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start date</Label>
                <Input
                  id="startDate"
                  type="date"
                  disabled={disabled}
                  value={value.dateRange?.startDate || ""}
                  onChange={(event) => handleChange("dateRange", {
                    ...value.dateRange,
                    startDate: event.target.value
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End date</Label>
                <Input
                  id="endDate"
                  type="date"
                  disabled={disabled}
                  value={value.dateRange?.endDate || ""}
                  onChange={(event) => handleChange("dateRange", {
                    ...value.dateRange,
                    endDate: event.target.value
                  })}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={disabled}>
                Reset to defaults
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
