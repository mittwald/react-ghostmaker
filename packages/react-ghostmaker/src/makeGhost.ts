import { createElement } from "react";
import {
  isGhostMarker,
  transformFnProp,
  type AnyFunction,
  type GhostChain,
  type ReactGhost,
  type ReactGhostMethods,
} from "./types.ts";
import { useGhostChain } from "./useGhostChain.ts";
import { RenderComponent } from "./RenderComponent.tsx";
import { resolveGhostChain } from "./resolveGhostChain.ts";
import { type QueryClient } from "@tanstack/react-query";
import { invalidateGhosts } from "./invalidate.ts";
import { queries } from "./queries.ts";
import { resetGhosts } from "./reset.ts";

type GhostMethodsWithoutPromise<T> = Omit<
  ReactGhostMethods<T>,
  "then" | "catch" | "finally" | SymbolConstructor["toStringTag"]
>;

function buildGhostDeep<T>(target: T, ghostChain: GhostChain): ReactGhost<T> {
  const proxyTarget = (() => {
    // Dummy function to allow ghosting function calls
  }) as never;

  const useQuery: ReactGhostMethods<T>["useGhost"] = (options) =>
    useGhostChain<T>(target, ghostChain, options);

  const useGhostMethods: GhostMethodsWithoutPromise<T> = {
    use: (options) => useQuery(options).value,
    useGhost: useQuery,

    render: (transform) => {
      const render = () => {
        const usedValue = useGhostMethods.use();
        return transform ? transform(usedValue) : usedValue;
      };
      return createElement(RenderComponent, { render });
    },

    transform: (fn, dependencies) => {
      ghostChain.push({
        propName: transformFnProp,
        args: [fn, dependencies],
      });
      return ghost;
    },

    invalidate: (queryClient: QueryClient) =>
      invalidateGhosts(queryClient, queries.ghostChain(target, ghostChain)),

    reset: (queryClient: QueryClient) =>
      resetGhosts(queryClient, queries.ghostChain(target, ghostChain)),
  };

  const ghost = new Proxy(proxyTarget, {
    get: ($, prop) => {
      if (prop === isGhostMarker) {
        return true;
      }

      if (prop in useGhostMethods) {
        return useGhostMethods[prop as keyof GhostMethodsWithoutPromise<T>];
      }

      if (prop === "then") {
        return (resolve: AnyFunction, reject: AnyFunction) =>
          resolveGhostChain(target, ghostChain).then(resolve).catch(reject);
      }

      if (prop === Symbol.toPrimitive) {
        return (hint: string) => {
          if (hint === "string") {
            return "ReactGhostmakerFunction";
          }
          return null;
        };
      }

      return buildGhostDeep(target, [
        ...ghostChain,
        {
          propName: String(prop),
        },
      ]);
    },

    apply: ($, $$, args) => {
      const prevCallStackEntry = ghostChain[ghostChain.length - 1];

      if (prevCallStackEntry) {
        prevCallStackEntry.args = args;
      }

      return buildGhostDeep(target, ghostChain);
    },
  });

  return ghost;
}

export function makeGhost<T>(target: T): ReactGhost<T> {
  return buildGhostDeep(target, []);
}
