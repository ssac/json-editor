import * as _ from 'lodash';

import { default as File, FileOpts } from './file';

type JsonValuePrimitive = string | number | object | boolean;
export type JsonValue = JsonValuePrimitive | JsonValuePrimitive[];

interface Options<T> {
  extractRows?: (jsonObj: object) => T[];
  rebuild?: (oriJsonObj: object, rows: T[]) => object;
}

export interface ParserOpts<T> {
  fileOpts: FileOpts;
  parserOpts?: Options<T>;
}

export default class<T> extends File {
  private parserOpts: Options<T>;
  private originalData: object;

  constructor(args: ParserOpts<T>) {
    super(args.fileOpts);
    this.parserOpts = args.parserOpts || {};
  }

  public async parseFile(): Promise<T[]> {
    const original = JSON.parse(this.read());
    this.originalData = original;

    if (!this.parserOpts?.extractRows) {
      if (!_.isArray(original)) {
        throw new Error(`Parsed data is not an array.`);
      }

      return original;
    }

    const extracted = this.parserOpts.extractRows(original);

    if (!_.isArray(extracted)) {
      throw new Error(`Extracted data is not an array.`);
    }

    return extracted;
  }

  public async writeFile(rows: T[]) {
    let outputData: T[] | object = rows;

    if (this.parserOpts?.rebuild) {
      outputData = this.parserOpts.rebuild(this.originalData, rows);
    }

    return this.write(JSON.stringify(outputData));
  }
}
