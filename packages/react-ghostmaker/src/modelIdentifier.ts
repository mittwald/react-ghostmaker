import type { ModelIdentifier } from "./types.ts";

export const modelIdentifiers: ModelIdentifier[] = [];

/** @deprecated Use GhostMakerModel (decorator) instead */
export const registerModelIdentifier = (identifier: ModelIdentifier): void => {
  modelIdentifiers.push(identifier);
};
