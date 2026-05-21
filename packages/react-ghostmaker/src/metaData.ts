import is from "@sindresorhus/is";
import type { AbstractClass, Class } from "type-fest";

type DecoratorTarget = Class<unknown> | AbstractClass<unknown>;

interface GhostMakerModelMeta<T extends DecoratorTarget> {
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

type DynamicModel = (
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
    getMetaDataRecursive(something, undefined, getClass(something)) ??
    getDynamicMetaData(something)
  );
};

const getMetaDataRecursive = (
  something: unknown,
  collectedMeta?: Partial<GhostMakerModelMeta<DecoratorTarget>>,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  klass?: Function,
): GhostMakerModelMeta<DecoratorTarget> | undefined => {
  const currentClass = getClass(something);

  const meta = store.get(klass ?? currentClass);

  const mergedMeta =
    meta || collectedMeta ? { ...meta, ...collectedMeta } : undefined;

  if (mergedMeta && "getId" in mergedMeta && "name" in mergedMeta) {
    return mergedMeta;
  }

  if (!klass) {
    return mergedMeta;
  }

  const prototypes = getProtoypes.current(klass);

  for (const proto of prototypes) {
    const result = getMetaDataRecursive(something, mergedMeta, proto);
    if (result) {
      return result;
    }
  }
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
