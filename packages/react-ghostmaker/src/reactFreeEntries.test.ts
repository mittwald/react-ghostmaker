import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, test } from "vitest";

const srcDir = __dirname;

const isReactPackage = (specifier: string) =>
  /^(react|react-dom|@tanstack\/react-query)(\/|$)/.test(specifier);

const collectPackageImports = (entry: string): Map<string, string[]> => {
  const packageImports = new Map<string, string[]>();
  const visited = new Set<string>();
  const queue = [resolve(srcDir, entry)];

  while (queue.length > 0) {
    const file = queue.pop()!;
    if (visited.has(file)) {
      continue;
    }
    visited.add(file);

    const { importedFiles } = ts.preProcessFile(
      readFileSync(file, "utf8"),
      true,
      true,
    );

    for (const { fileName: specifier } of importedFiles) {
      if (specifier.startsWith(".")) {
        queue.push(resolve(dirname(file), specifier));
      } else {
        const importers = packageImports.get(specifier) ?? [];
        importers.push(file.slice(srcDir.length + 1));
        packageImports.set(specifier, importers);
      }
    }
  }

  return packageImports;
};

describe.each(["model.ts", "polytype.ts"])("entry point %s", (entry) => {
  test("does not import React or TanStack Query, not even for types", () => {
    const reactImports = Array.from(collectPackageImports(entry)).filter(
      ([specifier]) => isReactPackage(specifier),
    );

    expect(Object.fromEntries(reactImports)).toEqual({});
  });
});

test("the import walker detects React imports", () => {
  expect(collectPackageImports("index.ts").has("react")).toBe(true);
});
