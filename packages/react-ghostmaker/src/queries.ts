import is from "@sindresorhus/is";
import type { GhostChain, GhostChainItem, QueryKey } from "./types.ts";
import { hashObject } from "./hash.ts";
import { getMetaData } from "./metaData.ts";
import { modelIdentifiers } from "./modelIdentifier.ts";

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

const getObjectName = (something: unknown) => {
  const modelName = getModelName(something);
  if (modelName) {
    return modelName;
  }

  const isClass = is.class(something);
  const isFunction = is.function(something);
  const isObject = is.object(something);

  return isFunction
    ? something.name
    : isClass || isObject
      ? something.constructor.name
      : "unknown";
};

const getTargetQueryKey = (something: unknown): string => {
  if (is.primitive(something)) {
    return String(something);
  }

  const objectName = getObjectName(something);

  const id = getModelId(something);
  if (id) {
    return `${objectName}@${id}`;
  }

  const thisModelIdentifiers = modelIdentifiers
    .map((fn) => fn(something))
    .filter(is.string)
    .join(".");

  if (thisModelIdentifiers) {
    return `${objectName}@${thisModelIdentifiers}`;
  }

  return objectName;
};

const getArgKey = (arg: unknown) => {
  if (is.primitive(arg)) {
    return String(arg);
  }
  return `${getObjectName(arg)}(hash:${hashObject(arg)})`;
};

export const queries = {
  ghostmaker: () => ["react-ghostmaker"],
  target: (target: unknown) => [
    ...queries.ghostmaker(),
    getTargetQueryKey(target),
  ],
  chainItem: (prev: QueryKey, chainItem: GhostChainItem) => {
    const { propName, args = [] } = chainItem;
    return [...prev, propName, ...args.map(getArgKey)];
  },
  ghostChain: (target: unknown, chain: GhostChain) =>
    chain.reduce(queries.chainItem, queries.target(target)),
};
