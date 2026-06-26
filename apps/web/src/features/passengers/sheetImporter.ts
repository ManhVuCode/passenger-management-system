import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export interface SheetRow {
  name: string
  phone: string
  email?: string
  type?: string
  hotelRoom?: string
  note?: string
}

export interface ImportResult {
  rows: SheetRow[]
  skippedColumns: string[]
  errors: string[]
  detectedMapping: Record<string, string>
}

const COLUMN_MAP: Record<string, keyof SheetRow> = {
  'họ và tên': 'name',
  'ho va ten': 'name',
  'họ tên': 'name',
  'ho ten': 'name',
  name: 'name',
  'full name': 'name',

  tel: 'phone',
  phone: 'phone',
  'số điện thoại': 'phone',
  'so dien thoai': 'phone',
  'điện thoại': 'phone',

  email: 'email',
  'e-mail': 'email',
  mail: 'email',
  'thư điện tử': 'email',
  'thu dien tu': 'email',

  'đơn vị công tác': 'type',
  'don vi cong tac': 'type',
  'đơn vị': 'type',
  type: 'type',
  loại: 'type',
  loai: 'type',

  'phòng ks': 'hotelRoom',
  'phong ks': 'hotelRoom',
  'phòng khách sạn': 'hotelRoom',
  'phong khach san': 'hotelRoom',
  phòng: 'hotelRoom',
  'hotel room': 'hotelRoom',
  room: 'hotelRoom',

  'ghi chú': 'note',
  'ghi chu': 'note',
  note: 'note',
  'ghi chú thêm': 'note',
}

const SKIP_COLUMNS = new Set([
  's',
  'stt',
  'tt',
  'số hiệu',
  'so hieu',
  'tr',
  'tên',
  'ten',
  'l1',
  'l2',
  'l3',
  'l4',
  'l5',
])

export async function importFromSheetUrl(sheetUrl: string): Promise<ImportResult> {
  const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (!match) throw new Error('Invalid Google Sheets URL')
  const sheetId = match[1]

  const gidMatch = sheetUrl.match(/gid=(\d+)/)
  const gid = gidMatch ? gidMatch[1] : '0'

  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`

  let csvText: string
  try {
    const res = await fetch(csvUrl)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    csvText = await res.text()
  } catch {
    throw new Error(
      'Cannot fetch sheet. Make sure the sheet is set to "Anyone with the link can view".',
    )
  }

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    throw new Error('Failed to parse CSV: ' + parsed.errors[0].message)
  }

  return mapRecords(parsed.meta.fields ?? [], parsed.data)
}

/**
 * Nhập hành khách từ một tệp Excel (.xlsx/.xls) do người dùng tải lên.
 * Phân tích hoàn toàn ở trình duyệt bằng SheetJS — dùng chung bộ ánh xạ cột
 * và quy tắc kiểm tra với luồng đồng bộ Google Sheet, nên kết quả trùng định dạng.
 */
export async function importFromXlsxFile(file: File): Promise<ImportResult> {
  let wb: XLSX.WorkBook
  try {
    const buf = await file.arrayBuffer()
    wb = XLSX.read(buf, { type: 'array' })
  } catch {
    throw new Error('Cannot read the file. Please make sure it is a valid .xlsx/.xls workbook.')
  }
  const sheetName = wb.SheetNames[0]
  if (!sheetName) throw new Error('The workbook has no sheets')
  const records = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[sheetName], {
    defval: '',
    raw: false,
  })
  if (records.length === 0) throw new Error('The first sheet has no data rows')
  const headers = Object.keys(records[0])
  return mapRecords(headers, records)
}

/** Ánh xạ cột + kiểm tra dùng chung cho cả CSV (Google Sheet) lẫn Excel. */
function mapRecords(rawHeaders: string[], data: Record<string, string>[]): ImportResult {
  const headers = rawHeaders.filter(Boolean)
  const detectedMapping: Record<string, string> = {}
  const skippedColumns: string[] = []

  const colToField = new Map<string, keyof SheetRow>()
  for (const header of headers) {
    const normalized = header.toLowerCase().trim()
    if (SKIP_COLUMNS.has(normalized)) {
      skippedColumns.push(header)
      continue
    }
    const field = COLUMN_MAP[normalized]
    if (field) {
      colToField.set(header, field)
      detectedMapping[header] = field
    } else {
      skippedColumns.push(header)
    }
  }

  const hasName = [...colToField.values()].includes('name')
  const hasPhone = [...colToField.values()].includes('phone')
  if (!hasName) throw new Error('The file must have a "Họ và tên" or "name" column')
  if (!hasPhone) throw new Error('The file must have a "Tel" or "phone" column')

  const rows: SheetRow[] = []
  const errors: string[] = []

  for (let i = 0; i < data.length; i++) {
    const raw = data[i]
    const row: Partial<SheetRow> = {}

    for (const [col, field] of colToField) {
      const val = (raw[col] ?? '').toString().trim()
      if (val) row[field] = val
    }

    if (!row.name) {
      errors.push(`Row ${i + 2}: missing name`)
      continue
    }
    if (!row.phone) {
      errors.push(`Row ${i + 2}: missing phone`)
      continue
    }

    const cleanPhone = row.phone.replace(/\D/g, '')
    if (cleanPhone.length !== 10) {
      errors.push(`Row ${i + 2}: phone "${row.phone}" is not 10 digits — skipped`)
      continue
    }
    row.phone = cleanPhone

    rows.push(row as SheetRow)
  }

  return { rows, skippedColumns, errors, detectedMapping }
}
