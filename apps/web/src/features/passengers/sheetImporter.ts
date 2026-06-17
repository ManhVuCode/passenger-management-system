import Papa from 'papaparse'

export interface SheetRow {
  name: string
  phone: string
  email?: string
  type?: string
  hotelRoom?: string
  note?: string
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

export async function importFromSheetUrl(sheetUrl: string): Promise<{
  rows: SheetRow[]
  skippedColumns: string[]
  errors: string[]
  detectedMapping: Record<string, string>
}> {
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

  const headers = parsed.meta.fields ?? []
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
  if (!hasName) throw new Error('Sheet must have a "Họ và tên" or "name" column')
  if (!hasPhone) throw new Error('Sheet must have a "Tel" or "phone" column')

  const rows: SheetRow[] = []
  const errors: string[] = []

  for (let i = 0; i < parsed.data.length; i++) {
    const raw = parsed.data[i]
    const row: Partial<SheetRow> = {}

    for (const [col, field] of colToField) {
      const val = raw[col]?.trim() ?? ''
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
