import { v4 as uuidv4 } from 'uuid';
import * as os from 'os';
import * as path from 'path';

export function getRandomFileName(): string {
  return `${uuidv4()}.json`;
}

export function getRandomFilePath(): string {
  return path.resolve(os.tmpdir(), getRandomFileName());
}
