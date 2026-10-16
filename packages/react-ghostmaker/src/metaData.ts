import is from "@sindresorhus/is";
import type { AbstractClass, Class } from "type-fest";

type DecoratorTarget = Class<unknown> | AbstractClass<unknown>;

export interface GhostMakerModelMeta<T extends DecoratorTarget> {
  getId?: (instance: InstanceType<T>) => string;
  name?: string;
}

const store = new Map<unknown, GhostMakerModelMeta<DecoratorTarget>>();

const isDev =
  typeof process !== "undefined" && process.env.NODE_ENV !== "production";

const testNameConflict = (name: string) => {
  if (Array.from(store.values()).some((meta) => meta.name === name)) {
    const message = `GhostMakerModel name conflict: A model with the name "${name}" is already registered.`;

    if (isDev) {
      console.warn(message);
    } else {
      throw new Error(message);
    }
  }
};

export function GhostMakerModel<T extends DecoratorTarget>(
  options: GhostMakerModelMeta<T>,
) {
  return function (target: T) {
    if (options.name) {
      testNameConflict(options.name);
    }
    store.set(target, options);
  };
}

export type DynamicModel = (
  something: unknown,
) => GhostMakerModelMeta<DecoratorTarget> | void | undefined;

const dynamicModels: DynamicModel[] = [];

export function ghostMakerModel(modelIdentifier: DynamicModel): void {
  dynamicModels.push(modelIdentifier);
}

const getDynamicMetaData = (
  something: unknown,
): GhostMakerModelMeta<DecoratorTarget> | undefined => {
  for (const identifyModel of dynamicModels) {
    const meta = identifyModel(something);
    if (meta) {
      return meta;
    }
  }
};

export const getMetaData = (
  something: unknown,
): GhostMakerModelMeta<DecoratorTarget> | undefined => {
  return (
    getMetaDataRecursive(getClass(something), undefined) ??
    getDynamicMetaData(something)
  );
};

export const getModelName = (something: unknown) => {
  return getMetaData(something)?.name;
};

export const getModelId = (something: unknown): string | undefined => {
  if (is.object(something)) {
    const getId = getMetaData(something)?.getId;
    if (getId) {
      return getId(something);
    }
  }
};

const isCompleteMetaData = (
  meta: GhostMakerModelMeta<DecoratorTarget> | undefined,
) => !!meta && "getId" in meta && "name" in meta;

/**
 * Collects meta data depth-first along the prototype chain(s). Meta data of the
 * class itself wins over its parents, earlier parents (including their
 * ancestors) win over later ones.
 */
const getMetaDataRecursive = (
  klass: unknown,
  collectedMeta: GhostMakerModelMeta<DecoratorTarget> | undefined,
): GhostMakerModelMeta<DecoratorTarget> | undefined => {
  if (isCompleteMetaData(collectedMeta) || is.nullOrUndefined(klass)) {
    return collectedMeta;
  }

  const meta = store.get(klass);

  let mergedMeta =
    meta || collectedMeta ? { ...meta, ...collectedMeta } : undefined;

  for (const proto of getProtoypes.current(klass)) {
    mergedMeta = getMetaDataRecursive(proto, mergedMeta);
  }

  return mergedMeta;
};

function isClass(value: unknown): value is Class<unknown> {
  return typeof value === "function" && /class[\s{]/.test(value.toString());
}

const getClass = (
  something: unknown,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
): Function | Class<unknown> | undefined => {
  return isClass(something)
    ? something
    : is.object(something)
      ? something.constructor
      : undefined;
};

export const getProtoypes = {
  current: (something: unknown) => {
    return [Object.getPrototypeOf(something)];
  },
};
