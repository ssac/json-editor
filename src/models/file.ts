import * as fs from 'fs';

import * as Logger from '../utils/logger';
import * as UtilsFilePath from '../utils/file-path';

export interface FileWriteResponse {
  backupPath: string;
  outputPath: string;
}

/**
 * filePath: the original file path
 * outputPath: the written file path
 */
export interface FileOpts {
  filePath: string;
  outputPath?: string;
}

export default class {
  private args: FileOpts;

  constructor(args: FileOpts) {
    this.args = args;
  }

  protected read() {
    return fs.readFileSync(this.args.filePath, { encoding: 'utf-8' });
  }

  protected write(content: string): FileWriteResponse {
    const outputPath = this.getOutputPath();
    let backupPath = '';

    if (this.args.filePath === outputPath) {
      Logger.log(
        `Because output path is the same as original file path, it is going to backup the original file automatically.`,
      );
      backupPath = this.backup(outputPath);
    }

    fs.writeFileSync(outputPath, content, 'utf8');

    return {
      backupPath,
      outputPath,
    };
  }

  // Backup existing file in case any accident
  private backup(oriFilePath: string): string {
    Logger.log(`Backing up original file in case any accident happen.`);
    const backupPath = UtilsFilePath.getRandomFilePath();
    Logger.log(`The backup file located at ${backupPath}`);
    fs.copyFileSync(oriFilePath, backupPath);
    return backupPath;
  }

  private getOutputPath(): string {
    if (!!this?.args?.outputPath) {
      return this.args.outputPath;
    }

    return UtilsFilePath.getRandomFilePath();
  }
}
