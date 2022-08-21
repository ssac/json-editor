import * as path from 'path';
import * as fs from 'fs';

import { DbLike as Helper } from '../index';

function getContent(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, { encoding: 'utf-8' }));
}

const helper = new Helper<'name', { name: string; sex: 'M' | 'F'; age: number }>({
  fileOpts: {
    filePath: path.resolve(__dirname, './complex.json'),
  },
  parserOpts: {
    extractRows: (json) => json?.['list'],
    rebuild: (json, rows) => ({ ...json, list: rows }),
  },
  dbLikeOpts: {
    idField: 'name',
  },
});

test('Test Helper.editFieldById(), isSaveOnDone=false', async () => {
  const changedResult = await helper.editFieldById({
    idValue: 'Peter',
    field: 'age',
    value: 25, // <===
    isSaveOnDone: false,
  });

  expect(changedResult.resultRows).toStrictEqual([
    {
      name: 'Peter',
      age: 25, // <===
      sex: 'M',
    },
    {
      name: 'Sue',
      age: 16,
      sex: 'F',
    },
  ]);

  const changedBySyncFunc = await helper.editFieldById({
    idValue: 'Peter',
    field: 'sex',
    value: ({ row, rows }) => {
      return row.sex === 'F' ? 'M' : 'F';
    },
    isSaveOnDone: false,
  });

  expect(changedBySyncFunc.resultRows).toStrictEqual([
    {
      name: 'Peter',
      age: 18,
      sex: 'F', // <===
    },
    {
      name: 'Sue',
      age: 16,
      sex: 'F',
    },
  ]);

  // Test the async function to edit celll value
  const changeByAsyncFunc = await helper.editFieldById({
    idValue: 'Peter',
    field: 'sex',
    value: async ({ row, rows }) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(row.sex === 'F' ? 'M' : 'F');
        }, 20);
      });
    },
    isSaveOnDone: false,
  });

  expect(changeByAsyncFunc.resultRows).toStrictEqual([
    {
      name: 'Peter',
      age: 18,
      sex: 'F', // <===
    },
    {
      name: 'Sue',
      age: 16,
      sex: 'F',
    },
  ]);
});

test('Test Helper.editFieldById(), isSaveOnDone=true', async () => {
  const changeByValue = await helper.editFieldById({
    idValue: 'Peter',
    field: 'age',
    value: 25, // <===
    isSaveOnDone: true,
  });

  const outputContent = getContent(changeByValue.outputPath);
  expect(outputContent).toStrictEqual({
    name: 'test',
    list: changeByValue.resultRows,
  });
});
