import { expectTypeOf, test } from "vitest";
import type { Customer, ProjectDetailed } from "./testMocks.ts";
import { ProjectGhost } from "./testMocks.ts";
import type { ReactGhost } from "./types.ts";

test("return type is correct", () => {
  const customerNameGhost = ProjectGhost.ofId("Project A")
    .getDetailed()
    .customer.getDetailed()
    .getName();

  expectTypeOf(customerNameGhost).toEqualTypeOf<ReactGhost<string>>();
});

test("optional return type is correct", () => {
  const projectGhost = ProjectGhost.ofId("Project A").findDetailed();

  expectTypeOf(projectGhost).toEqualTypeOf<
    ReactGhost<ProjectDetailed | undefined>
  >();

  expectTypeOf(projectGhost.customer).toEqualTypeOf<
    ReactGhost<Customer | undefined>
  >();

  const customerNameGhost = projectGhost.customer.getDetailed().getName();

  expectTypeOf(customerNameGhost).toEqualTypeOf<
    ReactGhost<string | undefined>
  >();

  projectGhost.name.transform((name) => {
    expectTypeOf(name).toEqualTypeOf<string | undefined>();
  });
});

test("transform return type is correct", () => {
  const transformedToNumber = ProjectGhost.ofId("Project A")
    .getDetailed()
    .name.transform(() => 0);

  expectTypeOf(transformedToNumber).toEqualTypeOf<ReactGhost<number>>();
});
