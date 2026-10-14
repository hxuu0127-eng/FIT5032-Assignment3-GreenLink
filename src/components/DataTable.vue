<template>
  <section class="table-panel">
    <h3>{{ title }}</h3>
    <div class="table-tools">
      <label>Search all columns <input v-model="search" type="search" /></label>
      <button type="button" @click="exportCSV">Export CSV</button>
      <button type="button" @click="exportPDF" :disabled="exportingPDF">{{ exportingPDF ? 'Preparing PDF…' : 'Export PDF' }}</button>
    </div>
    <div class="table-tools">
      <label v-for="column in columns" :key="column.key">
        Search {{ column.label }}
        <input v-model="filters[column.key]" type="search" />
      </label>
    </div>
    <div class="table-scroll">
      <table>
        <caption class="visually-hidden">{{ title }} — searchable and sortable records</caption>
        <thead><tr><th v-for="column in columns" :key="column.key" scope="col">
          <button type="button" :aria-label="`Sort by ${column.label}`" @click="sort(column.key)">{{ column.label }} {{ sortKey === column.key ? (ascending ? '▲' : '▼') : '↕' }}</button>
        </th></tr></thead>
        <tbody>
          <tr v-for="(row, index) in paged" :key="index"><td v-for="column in columns" :key="column.key">{{ row[column.key] }}</td></tr>
          <tr v-if="!paged.length"><td :colspan="columns.length">No matching records</td></tr>
        </tbody>
      </table>
    </div>
    <div class="table-tools">
      <span>Showing {{ paged.length }} of {{ filtered.length }} records</span>
      <button type="button" :disabled="page === 1" @click="page--">Previous</button>
      <span>Page {{ page }} / {{ pages }}</span>
      <button type="button" :disabled="page >= pages" @click="page++">Next</button>
    </div>
  </section>
</template>
<script setup>
import { ref, reactive, computed, watch } from 'vue'
const props = defineProps({ title: String, rows: { type: Array, required: true }, columns: { type: Array, required: true } })
const exportingPDF = ref(false)
const search = ref(''), filters = reactive({}), sortKey = ref(''), ascending = ref(true), page = ref(1)
const filtered = computed(() => {
  const term = search.value.toLowerCase()
  const data = props.rows.filter(row =>
    props.columns.some(col => String(row[col.key] ?? '').toLowerCase().includes(term)) &&
    props.columns.every(col => String(row[col.key] ?? '').toLowerCase().includes((filters[col.key] || '').toLowerCase()))
  )
  if (!sortKey.value) return data
  return [...data].sort((a,b) => {
    const x = a[sortKey.value], y = b[sortKey.value]
    const result = typeof x === 'number' && typeof y === 'number' ? x-y : String(x ?? '').localeCompare(String(y ?? ''), undefined, {numeric:true})
    return ascending.value ? result : -result
  })
})
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / 10)))
const paged = computed(() => filtered.value.slice((page.value - 1) * 10, page.value * 10))
watch(filtered, () => { page.value = Math.min(page.value, pages.value) })
function sort(key) { if (sortKey.value === key) ascending.value = !ascending.value; else { sortKey.value = key; ascending.value = true } }
async function exportPDF() {
  if (exportingPDF.value) return
  exportingPDF.value = true
  try {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(16)
    doc.text(props.title || 'GreenLink data', 14, 18)
    autoTable(doc, {
      startY: 25,
      head: [props.columns.map(c => c.label)],
      body: filtered.value.map(row => props.columns.map(c => String(row[c.key] ?? ''))),
      styles: { fontSize: 9, overflow: 'linebreak' },
      headStyles: { fillColor: [36, 88, 54] }
    })
    doc.save(`${(props.title || 'greenlink-data').replace(/[^a-z0-9-]/gi,'_')}.pdf`)
  } catch (error) {
    console.error('PDF export failed:', error)
    alert('Could not export PDF. Please check installed dependencies.')
  } finally { exportingPDF.value = false }
}
function exportCSV() {
  const escape = value => '"' + String(value ?? '').replaceAll('"', '""') + '"'
  const lines = [props.columns.map(c => escape(c.label)).join(','), ...filtered.value.map(row => props.columns.map(c => escape(row[c.key])).join(','))]
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {type:'text/csv;charset=utf-8'})
  const url = URL.createObjectURL(blob), a = document.createElement('a')
  a.href = url; a.download = `${props.title || 'data'}.csv`; a.click(); URL.revokeObjectURL(url)
}
</script>
<style scoped>
.table-panel { background:white; padding:20px; border-radius:8px; margin:24px 0 }
.table-tools { display:flex; flex-wrap:wrap; align-items:end; gap:12px; margin:12px 0 }
.table-tools label { flex:1 1 160px }
.table-scroll { overflow-x:auto }
table { border-collapse:collapse; width:100% }
th,td { border:1px solid #ccc; padding:10px; text-align:left }
.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap} th button { margin:0; width:100%; background:#315c3a }
button:focus-visible,input:focus-visible { outline:3px solid #ffab00; outline-offset:2px }
</style>
