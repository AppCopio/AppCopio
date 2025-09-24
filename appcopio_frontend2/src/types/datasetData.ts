// src/types/datasetData.ts
import type { DatasetTemplateKey } from "./dataset";

export type DatasetData = {
  columns: string[];
  rows: Array<{ id: string; [k: string]: any }>;
};

export type DatasetDataService = {
  getOrInitDatasetData: (
    activationId: number,
    datasetKey: string,
    templateKey?: DatasetTemplateKey
  ) => Promise<DatasetData>;

  addColumn: (
    activationId: number,
    datasetKey: string,
    columnName: string
  ) => Promise<DatasetData>;

  addRow: (
    activationId: number,
    datasetKey: string
  ) => Promise<DatasetData>;

  updateCell: (
    activationId: number,
    datasetKey: string,
    rowId: string,
    column: string,
    value: any
  ) => Promise<DatasetData>;

  deleteRow: (
    activationId: number,
    datasetKey: string,
    rowId: string
  ) => Promise<DatasetData>;
};
