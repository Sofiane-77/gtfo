import type { ComponentType } from "inferno";
import TerminalLayout from "../layouts/TerminalLayout";

const layoutCache = new WeakMap<ComponentType<unknown>, ComponentType<unknown>>();

export default function withTerminalLayout<P>(Page: ComponentType<P>): ComponentType<P> {
  const cached = layoutCache.get(Page as ComponentType<unknown>) as ComponentType<P> | undefined;
  if (cached) return cached;

  const Wrapped = (props: P) => (
    <TerminalLayout>
      <Page {...props} />
    </TerminalLayout>
  );

  layoutCache.set(Page as ComponentType<unknown>, Wrapped as ComponentType<unknown>);
  return Wrapped;
}
