import { Route, Switch } from "wouter";
import LandingPage from "@/pages/landing";
import AppToolPage from "@/pages/app";
import NotFound from "@/pages/not-found";

export function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/app" component={AppToolPage} />
      <Route component={NotFound} />
    </Switch>
  );
}
