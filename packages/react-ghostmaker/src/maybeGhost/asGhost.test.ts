import { asGhostProps } from "../maybeGhost";
import { isReactGhost } from "../types.ts";
import { expect, test } from "vitest";

interface Props {
  first: string;
  second?: string;
  third: string | undefined;
}

test("makes Ghosts of all props", () => {
  const ghostProps = asGhostProps<Props>({
    first: "hello",
    second: "world",
    third: "!",
  });

  expect(ghostProps.firstGhost).toSatisfy(isReactGhost);
  expect(ghostProps.secondGhost).toSatisfy(isReactGhost);
  expect(ghostProps.thirdGhost).toSatisfy(isReactGhost);
});

test("does not make Ghosts of explicit undefined", () => {
  const ghostProps = asGhostProps<Props>({
    first: "hello",
    second: undefined,
    third: "!",
  });

  expect(ghostProps.firstGhost).toSatisfy(isReactGhost);
  expect(ghostProps.secondGhost).toBeUndefined();
  expect(ghostProps.thirdGhost).toSatisfy(isReactGhost);
});

test("does not make Ghosts of not given props", () => {
  const ghostProps = asGhostProps<Props>({
    first: "hello",
    third: "!",
  });

  expect(ghostProps.firstGhost).toSatisfy(isReactGhost);
  expect(ghostProps.secondGhost).toBeUndefined();
  expect(ghostProps.thirdGhost).toSatisfy(isReactGhost);
});

test("does not make Ghosts of excluded props", () => {
  const ghostProps = asGhostProps<Props>(
    {
      first: "hello",
      second: "world",
      third: "!",
    },
    ["first"],
  );

  expect(ghostProps.firstGhost).toSatisfy(isReactGhost);
  expect(ghostProps.secondGhost).not.toSatisfy(isReactGhost);
  expect(ghostProps.thirdGhost).not.toSatisfy(isReactGhost);
});
