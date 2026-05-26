import { expectTypeOf, test } from "vitest";
import type { Customer, ProjectDetailed } from "./testMocks.ts";
import { ProjectGhost } from "./testMocks.ts";
import type { ReactGhost } from "./types.ts";
import type { MaybeReactGhost } from "./maybeGhost/types.ts";
import { asGhost } from "./maybeGhost/asGhost.ts";

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

test("asGhost() works with generics", () => {
  class A {
    foo() {
      //
    }
  }
  class B {
    foo() {
      //
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function generic<T extends A & B>(prop: MaybeReactGhost<T>) {
    asGhost(prop).foo().use();
  }
});

test("calling function on optional props works", () => {
  const customerNameGhost = ProjectGhost.ofId("Project A")
    .getDetailed()
    .optionalCustomer?.getDetailed()
    .getName();

  expectTypeOf(customerNameGhost).toEqualTypeOf<ReactGhost<string>>();
});
