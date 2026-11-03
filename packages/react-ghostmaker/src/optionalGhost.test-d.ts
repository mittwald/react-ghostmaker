import { expectTypeOf, test } from "vitest";
import type { ProjectDetailed } from "./testMocks.ts";
import { ProjectGhost } from "./testMocks.ts";
import type { ReactGhost } from "./types.ts";
import { optionalGhost } from "./optionalGhost.ts";

test("optionalGhost() makes the value optional", () => {
  const projectGhost = ProjectGhost.ofId("Project A").getDetailed() as
    | ReactGhost<ProjectDetailed>
    | undefined;

  const optionalProjectGhost = optionalGhost(projectGhost);

  expectTypeOf(optionalProjectGhost).toEqualTypeOf<
    ReactGhost<ProjectDetailed | undefined>
  >();
  expectTypeOf(optionalProjectGhost.use()).toEqualTypeOf<
    ProjectDetailed | undefined
  >();
  expectTypeOf(optionalProjectGhost.name.use()).toEqualTypeOf<
    string | undefined
  >();
});
