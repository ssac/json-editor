import * as path from 'path';
import * as fs from 'fs';

import Helper from '../index';

function getContent(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, { encoding: 'utf-8' }));
}

const helper = new Helper<{ name: string; sex: 'M' | 'F'; age: number }>({
  fileOpts: {
    filePath: path.resolve(__dirname, './test.json'),
  },
});

test('Test Helper.loop(), isSaveOnDone=true', async () => {
  const changeByValue = await helper.loop({
    isSaveOnDone: true,
    isSaveOnError: false,
    transformer: ({ row, rows }) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve({
            ...row,
            sex: row.sex === 'F' ? 'M' : 'F',
          });
        }, 20);
      });
    },
  });

  const outputContent = getContent(changeByValue.outputPath);

  expect(outputContent).toStrictEqual([
    {
      name: 'Peter',
      age: 18,
      sex: 'F', // <===
    },
    {
      name: 'Sue',
      age: 16,
      sex: 'M', // <===
    },
  ]);
});

test('Test Helper.loop(), when error occurs', async () => {
  const temp = async () => {
    const result = await helper.loop({
      isSaveOnDone: true,
      isSaveOnError: true,
      transformer: ({ row, rows }) => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            // Trigger error
            if (row.name === 'Sue') {
              return reject(`For testing error.`);
            }

            resolve({
              ...row,
              sex: row.sex === 'F' ? 'M' : 'F',
            });
          }, 20);
        });
      },
    });
  }

  expect(temp).rejects.toThrow(`For testing error.`);
});

test('Test Collection.sort()', async () => {
  const result = await helper.sort((a, b) => {
    return a.age - b.age;
  });

  const outputContent = getContent(result.outputPath);

  expect(outputContent).toStrictEqual([
    {
      name: 'Sue',
      age: 16,
      sex: 'F', // <=== When error occurs, keep original data
    },
    {
      name: 'Peter',
      age: 18,
      sex: 'M', // <=== Changed
    },
  ]);
});

test('Test Collection.rewrite()', async () => {
  const result = await helper.rewrite({
    transform: async (rows) => {
      return rows.filter((row) => row.sex === 'M');
    },
  });

  const outputContent = getContent(result.outputPath);

  expect(outputContent).toStrictEqual([
    {
      name: 'Peter',
      age: 18,
      sex: 'M',
    },
  ]);
});
