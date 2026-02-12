import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';

import type { InfernoNode } from './types';

const CONTEXT_KEY = '__inferno_helmet__';

type ProviderProps = {
  value: unknown;
  children?: InfernoNode;
};

class Provider extends Component<ProviderProps> {
  getChildContext() {
    return { [CONTEXT_KEY]: this.props.value };
  }

  render() {
    return this.props.children as InfernoNode;
  }
}

(Provider as unknown as { childContextTypes?: Record<string, unknown> }).childContextTypes = {
  [CONTEXT_KEY]: () => null,
};

type ConsumerProps = {
  children: (value: unknown) => InfernoNode;
};

class Consumer extends Component<ConsumerProps> {
  render() {
    const ctx = this.context as Record<string, unknown> | undefined;
    const value = ctx ? ctx[CONTEXT_KEY] : undefined;
    return this.props.children(value);
  }
}

(Consumer as unknown as { contextTypes?: Record<string, unknown> }).contextTypes = {
  [CONTEXT_KEY]: () => null,
};

export const Context = { Provider, Consumer };
