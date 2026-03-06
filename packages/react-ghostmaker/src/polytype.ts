import { getPrototypeListOf } from "polytype";
import { getProtoypes } from "./metaData.ts";
getProtoypes.current = getPrototypeListOf;

export { GhostMakerModel } from "./metaData.ts";
