"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CategorySelector } from "./category-selector";
import { BeatSelector } from "./beat-selector";
import { CountrySelector } from "./country-selector";
import { SearchOptionsForm } from "./search-options-form";
import {
  CategoryHierarchy,
  FormStatus,
  SearchFormData,
  SearchFormProps,
  defaultSearchFormData
} from "./types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const schema = z.object({
  query: z.string().min(3, "Enter at least three characters").max(1000),
  countries: z.array(z.string()).min(1, "Pick at least one country").max(10),
  categories: z.array(z.string()).max(20),
  beats: z.array(z.string()).max(15),
  options: z.object({
    maxQueries: z.number().min(1).max(50),
    diversityThreshold: z.number().min(0).max(1),
    minRelevanceScore: z.number().min(0).max(1),
    enableAIEnhancement: z.boolean(),
    fallbackStrategies: z.boolean(),
    cacheEnabled: z.boolean(),
    priority: z.enum(["low", "medium", "high"]),
    languages: z.array(z.string()).optional(),
    regions: z.array(z.string()).optional(),
    outlets: z.array(z.string()).optional(),
    dateRange: z
      .object({ startDate: z.string().optional(), endDate: z.string().optional() })
      .optional()
  })
});

type SearchFormValues = z.infer<typeof schema>;

const sectionClass =
  "rounded-3xl bg-muted/20 px-5 py-5 shadow-sm ring-1 ring-border/15 dark:bg-muted/25";

export function SearchForm({
  onSubmit,
  initialValues,
  loading = false,
  disabled = false
}: SearchFormProps) {
  const [formStatus, setFormStatus] = useState<FormStatus>({
    loading: false,
    error: undefined,
    success: false
  });
  const [categories, setCategories] = useState<CategoryHierarchy[]>([]);
  const [optionalFiltersOpen, setOptionalFiltersOpen] = useState(false);

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...defaultSearchFormData,
      ...initialValues,
      options: {
        ...defaultSearchFormData.options,
        ...initialValues?.options
      }
    },
    mode: "onChange"
  });

  const {
    control,
    handleSubmit,
    formState: { isValid, isDirty, errors },
    reset,
    setValue,
    trigger,
    watch
  } = form;

  const watchedValues = watch();

  useEffect(() => {
    // simple in-memory catalogue for now
    setCategories([
      {
        id: "news",
        name: "News & current affairs",
        children: [
          { id: "politics", name: "Politics" },
          { id: "business", name: "Business" },
          { id: "tech", name: "Technology" }
        ]
      },
      {
        id: "lifestyle",
        name: "Lifestyle",
        children: [
          { id: "entertainment", name: "Entertainment" },
          { id: "sports", name: "Sports" }
        ]
      }
    ]);
  }, []);

  const handleFormSubmit = useCallback(
    async (values: SearchFormValues) => {
      setFormStatus({ loading: true, error: undefined, success: false });
      try {
        await onSubmit(values as SearchFormData);
        setFormStatus({ loading: false, error: undefined, success: true });
      } catch (error) {
        setFormStatus({
          loading: false,
          error: error instanceof Error ? error.message : "Something went wrong",
          success: false
        });
      }
    },
    [onSubmit]
  );

  const updateField = useCallback(
    async (name: keyof SearchFormValues, value: SearchFormValues[keyof SearchFormValues]) => {
      setValue(name, value as SearchFormValues[typeof name]);
      await trigger(name);
    },
    [setValue, trigger]
  );

  const countriesSelected = watchedValues.countries?.length ?? 0;
  const categoriesSelected = watchedValues.categories?.length ?? 0;
  const beatsSelected = watchedValues.beats?.length ?? 0;

  const isSubmitting = formStatus.loading || loading;
  const canSubmit = isValid && isDirty && !isSubmitting && !disabled;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-muted/20 px-4 py-3 shadow-sm ring-1 ring-border/10">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">Countries</p>
          <p className="text-2xl font-semibold text-foreground" aria-live="polite">
            {countriesSelected}
          </p>
        </div>
        <div className="rounded-2xl bg-muted/20 px-4 py-3 shadow-sm ring-1 ring-border/10">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">Categories</p>
          <p className="text-2xl font-semibold text-foreground" aria-live="polite">
            {categoriesSelected}
          </p>
        </div>
        <div className="rounded-2xl bg-muted/20 px-4 py-3 shadow-sm ring-1 ring-border/10">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">Beats</p>
          <p className="text-2xl font-semibold text-foreground" aria-live="polite">
            {beatsSelected}
          </p>
        </div>
      </div>

      {formStatus.error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {formStatus.error}
        </p>
      )}

      <Form {...form}>
        <form
          className="relative flex flex-col gap-4 pb-20"
          onSubmit={handleSubmit(handleFormSubmit)}
        >
          <section className={sectionClass}>
            <FormLabel className="text-sm font-semibold leading-none text-foreground">
              Search brief
            </FormLabel>
            <FormField
              control={control}
              name="query"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      data-testid="search-query-input"
                      disabled={disabled}
                      placeholder="e.g. Journalists covering climate tech and venture funding in Northern Europe"
                      className="min-h-[140px] rounded-2xl border border-border/30 bg-background/80 text-base leading-relaxed shadow-sm transition focus-visible:border-primary/50 focus-visible:ring-primary/40"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <section className={sectionClass}>
            <div className="flex items-center justify-between">
              <FormLabel className="text-sm font-semibold leading-none text-foreground">
                Geographic focus
              </FormLabel>
              <Badge
                variant="secondary"
                className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-600 ring-1 ring-amber-500/40 dark:text-amber-200"
              >
                Required
              </Badge>
            </div>
            <FormField
              control={control}
              name="countries"
              render={({ field }) => (
                <FormItem>
                  <CountrySelector
                    value={field.value}
                    onChange={(value) => updateField("countries", value)}
                    disabled={disabled}
                    error={errors.countries?.message}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <Collapsible open={optionalFiltersOpen} onOpenChange={setOptionalFiltersOpen}>
            <section className={cn(sectionClass, "space-y-0 p-0")}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 rounded-3xl px-5 py-4 text-left transition hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <span className="text-sm font-semibold leading-none text-foreground">
                    Optional filters
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      optionalFiltersOpen && "rotate-180 text-primary"
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 border-t border-border/10 px-5 py-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={control}
                    name="categories"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold leading-none text-foreground">
                          Categories
                        </FormLabel>
                        <FormControl>
                          <CategorySelector
                            value={field.value}
                            onChange={(value) => updateField("categories", value)}
                            categories={categories}
                            disabled={disabled}
                            error={errors.categories?.message}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="beats"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold leading-none text-foreground">
                          Beats
                        </FormLabel>
                        <FormControl>
                          <BeatSelector
                            value={field.value}
                            onChange={(value) => updateField("beats", value)}
                            disabled={disabled}
                            error={errors.beats?.message}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CollapsibleContent>
            </section>
          </Collapsible>

          <FormField
            control={control}
            name="options"
            render={({ field }) => (
              <FormItem>
                <SearchOptionsForm
                  value={field.value}
                  onChange={(value) => updateField("options", value)}
                  disabled={disabled}
                  className="border-none bg-muted/20 shadow-sm ring-1 ring-border/15 dark:bg-muted/25"
                />
              </FormItem>
            )}
          />

          <div className="sticky bottom-0 z-10 mt-3 flex flex-col gap-2 rounded-3xl border border-border/25 bg-background/95 px-4 py-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground/80">
              Up to {watchedValues.options?.maxQueries || 10} AI prompts.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="ghost"
                onClick={() => reset()}
                disabled={isSubmitting}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Reset
              </Button>
              <Button type="submit" size="lg" disabled={!canSubmit} className="shadow-md">
                {isSubmitting ? "Starting search…" : "Start AI search"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
