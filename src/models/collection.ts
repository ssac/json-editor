import * as _ from 'lodash';

import type { FileWriteResponse } from './file';

import { default as Parser, ParserOpts, JsonValue } from './parser';
import * as Logger from '../utils/logger';
import * as UtilsObject from '../utils/object';

export interface CollectionWriteResponse<T> extends FileWriteResponse {
  resultRows: T[];
}

export interface CellCbParams<T> extends RowCbParams<T> {
  cell: string;
}

export interface RowCbParams<T> {
  row: T;
  rows: T[];
}

export type RowData = {
  [key: string]: JsonValue;
};

export type CellTransformerSync<T> = (args: RowCbParams<T>) => JsonValue;
export type CellTransformerAsync<T> = (args: RowCbParams<T>) => Promise<JsonValue>;

export type RowValidatorSync<T> = (args: RowCbParams<T>) => boolean;
export type RowValidatorAsync<T> = (args: RowCbParams<T>) => Promise<boolean>;

export type RowTransformerSync<T> = (args: RowCbParams<T>) => T;
export type RowTransformerAsync<T> = (args: RowCbParams<T>) => Promise<T>;

export type Query<T> = { [key: string]: JsonValue } | RowValidatorSync<T> | RowValidatorAsync<T>;
export type CellTransformer<T> = JsonValue | CellTransformerSync<T> | CellTransformerAsync<T>;
export type RowTransformer<T> = { [key: string]: JsonValue } | RowTransformerSync<T> | RowTransformerAsync<T>;

export default class<T extends RowData> extends Parser<T> {
  constructor(args: ParserOpts) {
    super({
      fileOpts: args.fileOpts,
      parserOpts: args.parserOpts,
    });
  }

  private async validateQuery({ query, rows, row }: { query: Query<T>; row: T; rows: T[] }): Promise<boolean> {
    switch (query.constructor.name) {
      case 'Object':
        return UtilsObject.checkIfPartial(query, row);
      case 'Function':
        return (query as RowValidatorSync<T>)({ row, rows });
      case 'AsyncFunction':
        return await (query as RowValidatorAsync<T>)({ row, rows });
      default:
        throw new Error(`Passing invalid query.`);
    }
  }

  public async transformRow(transformer: RowTransformer<T>, rowArgs: RowCbParams<T>): Promise<T> {
    switch (transformer.constructor.name) {
      case 'String':
        return {
          ...rowArgs.row,
          ...transformer,
        };
      case 'Function':
        return (transformer as RowTransformerSync<T>)(rowArgs);
      case 'AsyncFunction':
        return await (transformer as RowTransformerAsync<T>)(rowArgs);
      default:
        throw new Error(`Passing wrong type of transformer: ${typeof transformer}`);
    }
  }

  public async transformCell(transformer: CellTransformer<T>, rowArgs: RowCbParams<T>): Promise<JsonValue> {
    switch (transformer.constructor.name) {
      case 'String':
      case 'Number':
      case 'Boolean':
      case 'Object':
        return transformer as JsonValue;
      case 'Function':
        return (transformer as CellTransformerSync<T>)(rowArgs);
      case 'AsyncFunction':
        return await (transformer as CellTransformerAsync<T>)(rowArgs);
      default:
        throw new Error(`Passing wrong type of value: ${typeof transformer}`);
    }
  }

  /**
   * Iterates over elements of collection, returning an array of all elements pass the give query.
   * @param query The criteria to filter rows
   * @param once Pick one row only
   * @returns List of rows suit the query criterial
   */
  public async filter({ query, once }: { query: Query<T>; once: boolean }): Promise<T[]> {
    const parsedRows = await this.parseFile();
    const result: T[] = [];

    for (const row of parsedRows) {
      if (await this.validateQuery({ query, row, rows: parsedRows })) {
        result.push(row);

        if (once) {
          break;
        }
      }
    }

    return result;
  }

  /**
   * Iterates all rows of a csv file, transforms rows thru given function.
   * @param query Criteria to filter rows to transform.
   * @param transformer A transform function to convert a row.
   * @param isSaveOnDone After the transform done, save the result to file system.
   * @param isSaveOnError When errors occur during transform process, save the transformed result and append the remaing rows to file system.
   * @returns
   */
  public async loop({
    query,
    transformer,
    isSaveOnDone,
    isSaveOnError,
  }: {
    query?: Query<T>;
    transformer: RowTransformer<T>;
    isSaveOnDone: boolean;
    isSaveOnError: boolean; // Save the file while encounter failure
  }): Promise<CollectionWriteResponse<T>> {
    const parsedRecords = await this.parseFile();
    const clonedList = parsedRecords.slice();
    const processedRows: T[] = [];
    let curProcessRow: T;

    try {
      while (clonedList.length > 0) {
        const shiftedRow = clonedList.shift();
        curProcessRow = shiftedRow;
        let newRow: T = shiftedRow;

        if (
          !query ||
          (await this.validateQuery({
            query,
            row: shiftedRow,
            rows: parsedRecords,
          }))
        ) {
          newRow = await this.transformRow(transformer, {
            row: shiftedRow,
            rows: parsedRecords,
          });
        }

        processedRows.push(newRow);
      }

      let fileWriteResp: FileWriteResponse = {
        outputPath: '',
        backupPath: '',
      };

      // Save the file if needed
      if (!!isSaveOnDone) {
        fileWriteResp = await this.writeFile(processedRows);
        Logger.log(`The output file was saved at ${fileWriteResp.outputPath}`);
      }

      return {
        ...fileWriteResp,
        resultRows: processedRows,
      };
    } catch (error) {
      if (!!isSaveOnError) {
        Logger.log(`Error occurs, now saving the processed data. error: ${error}`);

        const fileWriteResp = await this.writeFile([...processedRows, curProcessRow, ...clonedList]);

        Logger.log(`The intermediate file was saved at ${fileWriteResp.outputPath}`);

        return {
          ...fileWriteResp,
          resultRows: processedRows,
        };
      } else {
        Logger.log(`The process is configured not to save file while error occurs. error: ${error}`);
      }

      throw new Error(error);
    }
  }

  /**
   * Rewrite the whole file
   * @param transform A transform function to convert all elements of collection.
   */
  public async rewrite({ transform }: { transform: (rows: T[]) => Promise<T[]> }): Promise<CollectionWriteResponse<T>> {
    const converted = await transform((await this.parseFile()).slice());

    return {
      ...(await this.writeFile(converted)),
      resultRows: converted,
    };
  }

  /**
   * Sort a collection like Array.
   * @param compareFn The compare function use like Javascript sort function.
   * @returns A new collection after sort function.
   */
  public async sort(compareFn: (a: T, b: T) => number): Promise<CollectionWriteResponse<T>> {
    return this.rewrite({
      transform: async (cloned: T[]) => {
        cloned.sort(compareFn);
        return cloned;
      },
    });
  }
}
