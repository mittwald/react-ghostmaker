import { describe, expectTypeOf, test } from "vitest";
import { type MaybeReactGhost } from "./types.ts";
import type { ReactGhost } from "../types";
import { asGhostProps } from "./asGhost.ts";

interface ModelA {
  a: string;
}

interface ModelB {
  b: number;
}

type GhostA = ReactGhost<ModelA>;
type GhostB = ReactGhost<ModelB>;

describe("fixupMaybeReactGhostProps()", () => {
  test("works for one prop", () => {
    interface Props {
      a: MaybeReactGhost<GhostA>;
    }

    expectTypeOf(asGhostProps({} as Props)).toEqualTypeOf<{
      aGhost: ReactGhost<ModelA>;
    }>();
  });

  test("works for one optional prop", () => {
    interface Props {
      a?: MaybeReactGhost<GhostA>;
    }

    expectTypeOf(asGhostProps({} as Props)).toEqualTypeOf<{
      aGhost?: ReactGhost<ModelA>;
    }>();
  });

  test("works for two prop", () => {
    interface Props {
      a: MaybeReactGhost<GhostA>;
      b: MaybeReactGhost<GhostB>;
    }

    expectTypeOf(asGhostProps({} as Props)).toEqualTypeOf<{
      aGhost: ReactGhost<ModelA>;
      bGhost: ReactGhost<ModelB>;
    }>();
  });

  test("works for two selected props", () => {
    interface Props {
      a: MaybeReactGhost<GhostA>;
      b: MaybeReactGhost<GhostB>;
      c: string;
    }

    expectTypeOf(asGhostProps({} as Props, ["a", "b"])).toEqualTypeOf<{
      aGhost: ReactGhost<ModelA>;
      bGhost: ReactGhost<ModelB>;
      c: string;
    }>();
  });
});
