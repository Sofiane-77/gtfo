import { Component } from "inferno";
import { createElement } from "inferno-create-element";

import { Context } from "./context";

import { commitTagChanges } from "./client";

import { IS_DOM_ENVIRONMENT } from "./constants";
import { newServerState } from "./server";
import type {
  ContextValue,
  HelmetDataContext,
  HelmetProps,
  HelmetProviderHeap,
  InfernoNode,
} from "./types";
import { calcAggregatedState } from "./utils";

type ProviderProps = {
  children?: InfernoNode;
  context?: HelmetDataContext;
};

class HelmetProvider extends Component<ProviderProps> {
  private heap: HelmetProviderHeap = {
    firstRender: true,
    helmets: [],
    state: undefined,
  };

  private contextValue: ContextValue = {
    clientApply: () => {
      if (IS_DOM_ENVIRONMENT && !this.heap.state) {
        this.heap.state = calcAggregatedState(this.heap.helmets);
        if (this.heap.state.defer) {
          this.heap.nextAnimFrameId ??= requestAnimationFrame(() => {
            this.heap.state ??= calcAggregatedState(this.heap.helmets);
            commitTagChanges(this.heap.state, this.heap.firstRender);
            this.heap.firstRender = false;
            delete this.heap.nextAnimFrameId;
          });
        } else {
          if (this.heap.nextAnimFrameId !== undefined) {
            cancelAnimationFrame(this.heap.nextAnimFrameId);
            delete this.heap.nextAnimFrameId;
          }
          commitTagChanges(this.heap.state, this.heap.firstRender);
          this.heap.firstRender = false;
        }
      }
    },
    update: (id: string, props: HelmetProps | undefined) => {
      const idx = this.heap.helmets.findIndex(
        (item: [string, HelmetProps]) => item[0] === id,
      );
      if (idx >= 0) {
        delete this.heap.state;
        if (props) this.heap.helmets[idx]![1] = props;
        else this.heap.helmets.splice(idx, 1);
      } else if (props) {
        delete this.heap.state;
        this.heap.helmets.push([id, props]);
      }
    },
  };

  render() {
    const { children, context } = this.props;

    if (
      context &&
      (!context.helmet || context.helmet !== this.heap.serverState)
    ) {
      this.heap.serverState ??= newServerState(this.heap);
      // eslint-disable-next-line no-param-reassign
      context.helmet = this.heap.serverState;
    }

    return (
      <Context.Provider value={this.contextValue}>{children}</Context.Provider>
    );
  }
}

export default HelmetProvider;
