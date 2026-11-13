import fs from 'fs';
import path from 'path';
import { readZip, writeZip } from './xlsx/zip';
import type { EventTemplateRow } from './report-export';

/**
 * Genera el reporte en Excel reutilizando la plantilla institucional
 * `templates/reporte-eventos-erm-utc.xlsx`.
 *
 * Solo se reescriben las hojas de datos y las referencias del gráfico: estilos,
 * tema, formatos y el gráfico de barras de la plantilla se conservan intactos.
 */

export const TEMPLATE_PATH = path.join(
  process.cwd(),
  'templates',
  'reporte-eventos-erm-utc.xlsx'
);

/** Fila mínima de datos para que la hoja conserve el aspecto de la plantilla. */
const MIN_DATA_ROWS = 12;

/** Índices de la tabla de cadenas compartidas de la plantilla. */
const SHARED_STRING = {
  title: 0,
  headers: [1, 2, 3, 4, 5, 6, 7, 8],
  totalsLabel: 9,
};

/** Estilos (cellXfs) de la plantilla, por tipo de fila. */
const STYLE = {
  titleFirst: 17,
  titleRest: 18,
  header: 1,
  light: { center: 2, text: 3, hours: 4 },
  tinted: { center: 5, text: 6, hours: 7 },
  totals: { blank: 10, label: 11, hours: 12, count: 13 },
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Los caracteres de control no son válidos en XML 1.0.
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
}

function textCell(ref: string, style: number, value: string): string {
  if (!value) return `<c r="${ref}" s="${style}"/>`;
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(
    value
  )}</t></is></c>`;
}

function numberCell(ref: string, style: number, value: number): string {
  return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
}

function sharedCell(ref: string, style: number, index: number): string {
  return `<c r="${ref}" s="${style}" t="s"><v>${index}</v></c>`;
}

function buildSheet1(templateXml: string, rows: EventTemplateRow[]): string {
  const dataRowCount = Math.max(rows.length, MIN_DATA_ROWS);
  const firstDataRow = 3;
  const lastDataRow = firstDataRow + dataRowCount - 1;
  const totalsRow = lastDataRow + 1;

  // --- Fila 1: título combinado A1:H1 ---
  const titleCells = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((col, i) =>
    i === 0
      ? sharedCell(`${col}1`, STYLE.titleFirst, SHARED_STRING.title)
      : `<c r="${col}1" s="${STYLE.titleRest}"/>`
  );
  const rowsXml: string[] = [
    `<row r="1" spans="1:8" ht="34" customHeight="1">${titleCells.join('')}</row>`,
  ];

  // --- Fila 2: encabezados ---
  const headerCells = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((col, i) =>
    sharedCell(`${col}2`, STYLE.header, SHARED_STRING.headers[i])
  );
  rowsXml.push(
    `<row r="2" spans="1:8" ht="30" customHeight="1">${headerCells.join('')}</row>`
  );

  // --- Filas de datos (alternando superficie blanca / verde muy claro) ---
  for (let i = 0; i < dataRowCount; i++) {
    const rowNumber = firstDataRow + i;
    const palette = i % 2 === 0 ? STYLE.light : STYLE.tinted;
    const row = rows[i];

    const cells = row
      ? [
          textCell(`A${rowNumber}`, palette.center, row.fecha),
          textCell(`B${rowNumber}`, palette.text, row.nombre),
          textCell(`C${rowNumber}`, palette.text, row.eje),
          numberCell(`D${rowNumber}`, palette.hours, row.horas),
          numberCell(`E${rowNumber}`, palette.center, row.participantes),
          textCell(`F${rowNumber}`, palette.text, row.quienImpartio),
          textCell(`G${rowNumber}`, palette.text, row.deParteDe),
          textCell(`H${rowNumber}`, palette.text, row.observaciones),
        ]
      : [
          `<c r="A${rowNumber}" s="${palette.center}"/>`,
          `<c r="B${rowNumber}" s="${palette.text}"/>`,
          `<c r="C${rowNumber}" s="${palette.text}"/>`,
          `<c r="D${rowNumber}" s="${palette.hours}"/>`,
          `<c r="E${rowNumber}" s="${palette.center}"/>`,
          `<c r="F${rowNumber}" s="${palette.text}"/>`,
          `<c r="G${rowNumber}" s="${palette.text}"/>`,
          `<c r="H${rowNumber}" s="${palette.text}"/>`,
        ];

    rowsXml.push(
      `<row r="${rowNumber}" spans="1:8" ht="20" customHeight="1">${cells.join('')}</row>`
    );
  }

  // --- Fila de totales con fórmulas vivas ---
  const totalsCells = [
    `<c r="A${totalsRow}" s="${STYLE.totals.blank}"/>`,
    `<c r="B${totalsRow}" s="${STYLE.totals.blank}"/>`,
    sharedCell(`C${totalsRow}`, STYLE.totals.label, SHARED_STRING.totalsLabel),
    `<c r="D${totalsRow}" s="${STYLE.totals.hours}"><f>SUM(D${firstDataRow}:D${lastDataRow})</f></c>`,
    `<c r="E${totalsRow}" s="${STYLE.totals.count}"><f>SUM(E${firstDataRow}:E${lastDataRow})</f></c>`,
    `<c r="F${totalsRow}" s="${STYLE.totals.blank}"/>`,
    `<c r="G${totalsRow}" s="${STYLE.totals.blank}"/>`,
    `<c r="H${totalsRow}" s="${STYLE.totals.blank}"/>`,
  ];
  rowsXml.push(
    `<row r="${totalsRow}" spans="1:8" ht="24" customHeight="1">${totalsCells.join('')}</row>`
  );

  return templateXml
    .replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:H${totalsRow}"/>`)
    .replace(/<sheetData>[\s\S]*<\/sheetData>/, `<sheetData>${rowsXml.join('')}</sheetData>`)
    .replace(/<autoFilter ref="[^"]*"/, `<autoFilter ref="A2:H${lastDataRow}"`)
    .replace(/sqref="C3:C\d+"/, `sqref="C${firstDataRow}:C${lastDataRow}"`);
}

function buildSheet2(templateXml: string, lastDataRow: number): string {
  return (
    templateXml
      // Las fórmulas del resumen deben cubrir todas las filas generadas.
      .replace(/'Reporte de Eventos'!B3:B\d+/g, `'Reporte de Eventos'!B3:B${lastDataRow}`)
      .replace(/'Reporte de Eventos'!D3:D\d+/g, `'Reporte de Eventos'!D3:D${lastDataRow}`)
      .replace(/'Reporte de Eventos'!E3:E\d+/g, `'Reporte de Eventos'!E3:E${lastDataRow}`)
      // Se eliminan los valores en caché (incluido el #DIV/0! de la plantilla)
      // para que Excel y LibreOffice recalculen al abrir el archivo.
      .replace(/ t="e"(?=>)/g, '')
      .replace(/(<f>[^<]*<\/f>)<v>[^<]*<\/v>/g, '$1')
  );
}

function buildChart(templateXml: string, lastDataRow: number, pointCount: number): string {
  return (
    templateXml
      // Categorías: fechas como texto, por lo que se usa strRef en lugar de numRef.
      .replace(
        /<c:cat>[\s\S]*?<\/c:cat>/,
        `<c:cat><c:strRef><c:f>'Reporte de Eventos'!$A$3:$A$${lastDataRow}</c:f>` +
          `<c:strCache><c:ptCount val="${pointCount}"/></c:strCache></c:strRef></c:cat>`
      )
      .replace(
        /<c:val>[\s\S]*?<\/c:val>/,
        `<c:val><c:numRef><c:f>'Reporte de Eventos'!$E$3:$E$${lastDataRow}</c:f>` +
          `<c:numCache><c:formatCode>General</c:formatCode>` +
          `<c:ptCount val="${pointCount}"/></c:numCache></c:numRef></c:val>`
      )
  );
}

function buildWorkbook(templateXml: string, lastDataRow: number): string {
  return templateXml
    .replace(
      /'Reporte de Eventos'!\$A\$2:\$H\$\d+/,
      `'Reporte de Eventos'!$A$2:$H$${lastDataRow}`
    )
    .replace(/<calcPr ([^/]*)\/>/, '<calcPr $1 fullCalcOnLoad="1"/>');
}

/**
 * Devuelve el .xlsx institucional con los eventos filtrados ya cargados.
 */
export function buildEventsWorkbook(rows: EventTemplateRow[]): Buffer {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(
      `No se encontró la plantilla de Excel en «${TEMPLATE_PATH}». ` +
        'Verifique que el archivo templates/reporte-eventos-erm-utc.xlsx exista.'
    );
  }

  const entries = readZip(fs.readFileSync(TEMPLATE_PATH));
  const dataRowCount = Math.max(rows.length, MIN_DATA_ROWS);
  const lastDataRow = 2 + dataRowCount;
  const pointCount = Math.max(1, rows.length);

  const output: { name: string; data: Buffer }[] = [];

  for (const entry of entries) {
    // La cadena de cálculo queda obsoleta al regenerar las hojas: se elimina y
    // Excel la reconstruye sola al abrir el libro.
    if (entry.name === 'xl/calcChain.xml') continue;

    let xml: string | null = null;
    const asText = () => entry.data.toString('utf8');

    if (entry.name === 'xl/worksheets/sheet1.xml') {
      xml = buildSheet1(asText(), rows);
    } else if (entry.name === 'xl/worksheets/sheet2.xml') {
      xml = buildSheet2(asText(), lastDataRow);
    } else if (entry.name === 'xl/charts/chart1.xml') {
      xml = buildChart(asText(), lastDataRow, pointCount);
    } else if (entry.name === 'xl/workbook.xml') {
      xml = buildWorkbook(asText(), lastDataRow);
    } else if (entry.name === '[Content_Types].xml') {
      xml = asText().replace(
        /<Override PartName="\/xl\/calcChain\.xml"[^>]*\/>/,
        ''
      );
    } else if (entry.name === 'xl/_rels/workbook.xml.rels') {
      xml = asText().replace(/<Relationship [^>]*Target="calcChain\.xml"\/>/, '');
    }

    output.push({
      name: entry.name,
      data: xml === null ? entry.data : Buffer.from(xml, 'utf8'),
    });
  }

  return writeZip(output);
}
