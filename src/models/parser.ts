import File from './file';

import type { FileOpts } from './file';

type JsonValuePrimitive = string | number | object | boolean;
export type JsonValue = JsonValuePrimitive | JsonValuePrimitive[];

interface Options {}

export interface ParserOpts {
  fileOpts: FileOpts;
  parserOpts?: Options;
}

const DEFAULT_OPTS: Options = {};

export default class<T> extends File {
  private parserOpts: Options;

  constructor(args: ParserOpts) {
    super(args.fileOpts);
    this.parserOpts = args.parserOpts ? { ...DEFAULT_OPTS, ...args.parserOpts } : DEFAULT_OPTS;
  }

  public async parseFile(): Promise<T[]> {
    return JSON.parse(this.read());
  }

  public async writeFile(rows: T[]) {
    return this.write(JSON.stringify(rows));
  }
}
