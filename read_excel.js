import pkg from 'xlsx';
const { readFile, utils } = pkg;
const workbook = readFile('../exemplo.xlsx');
const sheet = workbook.Sheets['MATERIAL'];
const data = utils.sheet_to_json(sheet, { header: 1 });
for(let i=0; i<Math.min(data.length, 10); i++) {
  console.log(`Row ${i}:`, data[i]);
}
console.log("Total materiais:", data.length);
