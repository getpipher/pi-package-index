import type { IndexData } from "./types";
import indexData from "../../data/packages.json";

const data = indexData as IndexData;

export function getIndex(): IndexData {
  return data;
}

export function getPackages() {
  return data.packages;
}

export function getGeneratedAt(): string {
  return data.generatedAt;
}