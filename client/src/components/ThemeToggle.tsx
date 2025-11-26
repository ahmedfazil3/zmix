import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="hover-elevate active-elevate-2"
      data-testid="button-theme-toggle"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" data-testid="icon-sun" />
      ) : (
        <Moon className="h-5 w-5" data-testid="icon-moon" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
