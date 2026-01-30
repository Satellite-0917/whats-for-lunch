export type SheetRow = Record<string, string | number | null>;

const SHEET_ID = '1ck15HsaXDkDPHU0FTDKGyhdgJ1n30mH943FLP5xsGqQ';

export function parseGviz(text: string): SheetRow[] {
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('유효하지 않은 시트 응답입니다.');
  }
  const json = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  const table = json.table;
  const headers = table.cols.map((col: { label: string }) => col.label);
  return table.rows.map((row: { c: Array<{ v: string | number | null } | null> }) => {
    const record: SheetRow = {};
    row.c.forEach((cell, index) => {
      const key = headers[index];
      record[key] = cell?.v ?? null;
    });
    return record;
  });
}

export async function fetchSheet(sheetName: string, init?: RequestInit) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(sheetName)}`;
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error('데이터를 불러오지 못했습니다.');
  }
  const text = await response.text();
  return parseGviz(text);
}
