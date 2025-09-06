"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ThemeSandbox() {
  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Theme Sandbox</h1>
          <p className="text-muted-foreground">
            Test light and dark themes across all shadcn/ui components
          </p>
        </div>
        <ThemeToggle />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>All button variants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="default">Default</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
            </div>
          </CardContent>
        </Card>

        {/* Form Elements */}
        <Card>
          <CardHeader>
            <CardTitle>Form Elements</CardTitle>
            <CardDescription>Input fields and controls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Enter your name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" placeholder="Tell us about yourself" />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="notifications" />
              <Label htmlFor="notifications">Enable notifications</Label>
            </div>
          </CardContent>
        </Card>

        {/* Cards */}
        <Card>
          <CardHeader>
            <CardTitle>Card Example</CardTitle>
            <CardDescription>This is a sample card</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This card demonstrates how content appears in both light and dark modes.
              The background, text, and border colors will adapt automatically.
            </p>
          </CardContent>
        </Card>

        {/* Color Palette */}
        <Card>
          <CardHeader>
            <CardTitle>Color Palette</CardTitle>
            <CardDescription>Theme color tokens</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="h-10 w-full rounded bg-background border" />
                <p className="text-xs text-center">Background</p>
              </div>
              <div className="space-y-2">
                <div className="h-10 w-full rounded bg-foreground" />
                <p className="text-xs text-center text-muted-foreground">Foreground</p>
              </div>
              <div className="space-y-2">
                <div className="h-10 w-full rounded bg-primary" />
                <p className="text-xs text-center text-primary-foreground">Primary</p>
              </div>
              <div className="space-y-2">
                <div className="h-10 w-full rounded bg-secondary" />
                <p className="text-xs text-center text-secondary-foreground">Secondary</p>
              </div>
              <div className="space-y-2">
                <div className="h-10 w-full rounded bg-accent" />
                <p className="text-xs text-center text-accent-foreground">Accent</p>
              </div>
              <div className="space-y-2">
                <div className="h-10 w-full rounded bg-destructive" />
                <p className="text-xs text-center text-destructive-foreground">Destructive</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Text Styles */}
      <Card>
        <CardHeader>
          <CardTitle>Text Styles</CardTitle>
          <CardDescription>Typography hierarchy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h1 className="text-4xl font-bold">Heading 1</h1>
            <h2 className="text-3xl font-bold">Heading 2</h2>
            <h3 className="text-2xl font-bold">Heading 3</h3>
            <h4 className="text-xl font-bold">Heading 4</h4>
            <h5 className="text-lg font-bold">Heading 5</h5>
            <h6 className="text-base font-bold">Heading 6</h6>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Small muted text</p>
            <p className="text-sm">Small regular text</p>
            <p className="text-base">Base text</p>
            <p className="text-lg">Large text</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
