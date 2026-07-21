import { Route, Switch } from "wouter";
import LandingPage from "@/pages/landing";
import AppToolPage from "@/pages/app";
import TermsPage from "@/pages/terms";
import PrivacyPage from "@/pages/privacy";
import ContactPage from "@/pages/contact";
import NotFound from "@/pages/not-found";

export function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/app" component={AppToolPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/contact" component={ContactPage} />
      <Route component={NotFound} />
    </Switch>
  );
}
