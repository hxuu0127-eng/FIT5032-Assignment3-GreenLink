<template>
  <section class="table-panel" :aria-labelledby="headingId">
    <h3 :id="headingId">{{ title }}</h3>
    <div class="table-tools">
      <label>
        Search all columns
        <input v-model="search" type="search" autocomplete="off" />
      </label>
      <button type="button" @click="exportCSV">Export CSV</button>
      <button type="button" @click="exportPDF" :disabled="exportingPDF">
        {{ exportingPDF ? 'Preparing PDF…' : 'Export PDF' }}
      </button>
    </div>

    <div class="table-tools">
      <label v-for="column in columns" :key="column.key">
        Search {{ column.label }}
        <input v-model="filters[column.key]" type="search" autocomplete="off" />
      </label>
    </div>

    <p class="results-summary" role="status" aria-live="polite" aria-atomic="true">
      {{ filtered.length }} matching records. Page {{ page }} of {{ pages }}.
    </p>

    <div class="table-scroll" tabindex="0" role="region" :aria-label="`${title} data table, scroll horizontally if needed`">
      <table>
        <caption class="visually-hidden">{{ title }} — searchable and sortable records</caption>
        <thead>
          <tr>
            <th v-for="column in columns" :key="column.key" scope="col"
                :aria-sort="sortKey === column.key ? (ascending ? 'ascending' : 'descending') : undefined">
              <button type="button" :aria-label="sortLabel(column)" @click="sort(column.key)">
                {{ column.label }}
                <span aria-hidden="true">{{ sortKey === column.key ? (ascending ? '▲' : '▼') : '↕' }}</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in paged" :key="index">
            <td v-for="column in columns" :key="column.key">{{ row[column.key] }}</td>
          </tr>
          <tr v-if="!paged.length">
            <td :colspan="columns.length">No matching records. Try clearing your search filters.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <nav class="table-tools" :aria-label="`${title} pagination`">
      <span>Showing {{ paged.length }} of {{ filtered.length }} records</span>
      <button type="button" :disabled="page === 1" @click="page--">Previous</button>
      <span>Page {{ page }} / {{ pages }}</span>
      <button type="button" :disabled="page >= pages" @click="page++">Next</button>
    </nav>
    <p v-if="exportStatus" role="status" aria-live="polite">{{ exportStatus }}</p>
  </section>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'

const props = defineProps({
  title: String,
  rows: { type: Array, required: true },
  columns: { type: Array, required: true }
})

const headingId = `table-heading-${Math.random().toString(36).slice(2, 10)}`
const exportingPDF = ref(false)
const exportStatus = ref('')
const search = ref('')
const filters = reactive({})
const sortKey = ref('')
const ascending = ref(true)
const page = ref(1)

const filtered = computed(() => {
  const term = search.value.toLowerCase()
  const data = props.rows.filter(row =>
    props.columns.some(col => String(row[col.key] ?? '').toLowerCase().includes(term)) &&
    props.columns.every(col => String(row[col.key] ?? '').toLowerCase().includes((filters[col.key] || '').toLowerCase()))
  )
  if (!sortKey.value) return data
  return [...data].sort((a, b) => {
    const x = a[sortKey.value]
    const y = b[sortKey.value]
    const result = typeof x === 'number' && typeof y === 'number'
      ? x - y
      : String(x ?? '').localeCompare(String(y ?? ''), undefined, { numeric: true })
    return ascending.value ? result : -result
  })
})

const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / 10)))
const paged = computed(() => filtered.value.slice((page.value - 1) * 10, page.value * 10))

watch([search, () => props.columns.map(c => filters[c.key]).join('\u0000')], () => {
  page.value = 1
})
watch(pages, newPages => {
  if (page.value > newPages) page.value = newPages
})

function sort(key) {
  if (sortKey.value === key) ascending.value = !ascending.value
  else { sortKey.value = key; ascending.value = true }
}

function sortLabel(column) {
  if (sortKey.value !== column.key) return `Sort by ${column.label}, ascending`
  return `Sort by ${column.label}, ${ascending.value ? 'descending' : 'ascending'} next`
}

async function exportPDF() {
  if (exportingPDF.value) return
  exportStatus.value = ''
  exportingPDF.value = true
  try {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'), import('jspdf-autotable')
    ])
    const pdf = new jsPDF({ orientation: 'landscape' })
    pdf.setFontSize(16)
    pdf.text(props.title || 'GreenLink data', 14, 18)
    autoTable(pdf, {
      startY: 25,
      head: [props.columns.map(c => c.label)],
      body: filtered.value.map(row => props.columns.map(c => String(row[c.key] ?? ''))),
      styles: { fontSize: 9, overflow: 'linebreak' },
      headStyles: { fillColor: [36, 88, 54] }
    })
    pdf.save(`${(props.title || 'greenlink-data').replace(/[^a-z0-9-]/gi, '_')}.pdf`)
    exportStatus.value = 'PDF download started.'
  } catch (error) {
    console.error('PDF export failed:', error)
    exportStatus.value = 'Could not export PDF. Please check installed dependencies.'
  } finally {
    exportingPDF.value = false
  }
}

function exportCSV() {
  exportStatus.value = ''
  try {
    const escape = value => '"' + String(value ?? '').replaceAll('"', '""') + '"'
    const lines = [
      props.columns.map(c => escape(c.label)).join(','),
      ...filtered.value.map(row => props.columns.map(c => escape(row[c.key])).join(','))
    ]
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(props.title || 'data').replace(/[^a-z0-9-]/gi, '_')}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    exportStatus.value = 'CSV download started.'
  } catch (error) {
    console.error('CSV export failed:', error)
    exportStatus.value = 'Could not export CSV.'
  }
}
</script>

<style scoped>
.table-panel { background: white; padding: 20px; border-radius: 8px; margin: 24px 0; min-width: 0 }
.table-tools { display: flex; flex-wrap: wrap; align-items: end; gap: 12px; margin: 12px 0 }
.table-tools label { flex: 1 1 160px }
.table-scroll { overflow-x: auto; max-width: 100% }
table { border-collapse: collapse; width: 100% }
th, td { border: 1px solid #ccc; padding: 10px; text-align: left }
th { background: #315c3a; color: white }
.visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0 }
th button { margin: 0; width: 100%; background: #315c3a; color: white; text-align: left }
button:focus-visible, input:focus-visible, .table-scroll:focus-visible { outline: 3px solid #b45309; outline-offset: 3px }
.results-summary { margin: 12px 0 }
@media (max-width: 600px) { .table-panel { padding: 12px } }
</style>
