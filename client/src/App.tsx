import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Header } from "@/components/Header";
import Home from "@/pages/home";
import Auth from "@/pages/auth";
import History from "@/pages/history";
import Loyalty from "@/pages/loyalty";
import Referral from "@/pages/referral";
import Roadmap from "@/pages/roadmap";
import Docs from "@/pages/docs";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={Auth} />
      <Route path="/history">
        <Header />
        <History />
      </Route>
      <Route path="/loyalty">
        <Header />
        <Loyalty />
      </Route>
      <Route path="/referral">
        <Header />
        <Referral />
      </Route>
      <Route path="/roadmap">
        <Header />
        <Roadmap />
      </Route>
      <Route path="/docs">
        <Header />
        <Docs />
      </Route>
      <Route path="/">
        <Header />
        <Home />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
