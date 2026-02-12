import { Fragment } from "inferno";
import { Route } from "inferno-router";
import withTerminalLayout from "./composition/withTerminalLayout";
import Home from "src/features/home/ui/Home";
import LogsPage from "src/features/logs/ui/LogsPage";
import R8A2Page from "src/features/r8a2/ui/R8A2Page";
import { withBase } from "src/shared/base";

const LogsWithLayout = withTerminalLayout(LogsPage);

export default function AppRoutes() {
  return (
    <Fragment>
      <Route exact path={withBase("/")} component={Home} />
      <Route exact path={withBase("/logs")}  component={LogsWithLayout} />
      <Route exact path={withBase("/r8a2")}  component={R8A2Page} />
    </Fragment>
  );
}
