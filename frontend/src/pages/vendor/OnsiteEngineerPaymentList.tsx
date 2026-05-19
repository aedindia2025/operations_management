import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";
import { fetchOnsiteEngineerPayments, type OnsiteEngineerPaymentRow } from "../../api/onsiteEngineerPaymentApi";

const PAGE_LENGTH_OPTIONS = [10, 25, 50, 100] as const;

function money(value: number) {
  return Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PdfLink({ href, label }: { href?: string; label: string }) {
  if (!href) return <span className="text-ink-muted">-</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer" title={label} className="inline-flex h-7 w-7 items-center justify-center rounded border border-red-100 bg-white text-danger hover:bg-red-50">
      <i className="fa fa-file-pdf" />
    </a>
  );
}

export default function OnsiteEngineerPaymentList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<OnsiteEngineerPaymentRow[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [length, setLength] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchOnsiteEngineerPayments({ search, page, length })
      .then((res) => {
        setRows(res.data ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((err) => setError(err?.response?.data?.message || err?.message || "Failed to load onsite engineer payments."))
      .finally(() => setLoading(false));
  }, [search, page, length]);

  useEffect(() => setPage(1), [search, length]);

  const totalPages = Math.max(1, Math.ceil(total / length));
  const pageStart = total === 0 ? 0 : (page - 1) * length + 1;
  const pageEnd = Math.min(page * length, total);
  const cols = useMemo(() => ["S.No", "Bill No / Date", "Engineer", "Services Charges", "Rate", "GST", "Total", "Files", "Approval", "Accounts", "Management", "Payment"], []);

  return (
    <div className="min-h-screen bg-[#f7f8ef] p-4 md:p-6">
      <PageTopbar title="Onsite Engineer Payment List" breadcrumbs={["Vendor", "Onsite Engineer Payment"]} />

      <div className="rounded-[26px] border border-[#e1dcc8] bg-white shadow-[0_18px_42px_rgba(84,96,28,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece5ca] p-5">
          <button onClick={() => navigate("/vendor/onsite-engineer-payment/form")} className="rounded-lg bg-brand-700 px-5 py-2 text-[13px] font-semibold text-white">
            Add Onsite Payment
          </button>
          <div className="flex items-center gap-3 text-[13px] text-ink-secondary">
            Show
            <SearchableSelectInput name="length" value={length} onChange={(e) => setLength(Number(e.target.value))} className="w-24 rounded-lg border border-line-dark bg-white px-3 py-2">
              {PAGE_LENGTH_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </SearchableSelectInput>
            entries
            <input name="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-56 rounded-lg border border-line-dark bg-white px-3 py-2 outline-none focus:border-brand-600" />
          </div>
        </div>

        {error ? <div className="m-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</div> : null}

        <div className="overflow-x-auto p-5">
          <table className="w-full min-w-[1200px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-surface-2">
                {cols.map((col) => <th key={col} className="border border-line-dark px-3 py-2.5 text-center text-[12px] font-semibold text-[#3d5a20]">{col}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={cols.length} className="border border-line py-10 text-center text-ink-muted">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={cols.length} className="border border-line py-10 text-center text-ink-muted">No data available in table</td></tr>
              ) : rows.map((row) => (
                <tr key={row.unique_id} className="border-b border-line/50 hover:bg-brand-50/30">
                  <td className="border-x border-line/50 px-3 py-3 text-center">{row.s_no}</td>
                  <td className="border-x border-line/50 px-3 py-3"><div className="font-semibold text-ink">{row.bill_no}</div><div className="text-[11px] text-ink-muted">{row.bill_date}</div></td>
                  <td className="border-x border-line/50 px-3 py-3"><div className="font-semibold text-ink">{row.engineer_name}</div><div className="text-[11px] text-ink-muted">{row.engineer_type}</div></td>
                  <td className="border-x border-line/50 px-3 py-3 text-ink-secondary">{row.services_charges || "-"}</td>
                  <td className="border-x border-line/50 px-3 py-3 text-right font-semibold">{money(row.rate)}</td>
                  <td className="border-x border-line/50 px-3 py-3 text-center">{row.gst}%</td>
                  <td className="border-x border-line/50 px-3 py-3 text-right font-bold text-[#52651e]">{money(row.total_amount)}</td>
                  <td className="border-x border-line/50 px-3 py-3 text-center">
                    <div className="inline-flex gap-2">
                      <PdfLink href={row.bill_copy_url} label="Bill Copy" />
                      <PdfLink href={row.vendor_po_copy_url} label="Vendor PO Copy" />
                    </div>
                  </td>
                  <td className="border-x border-line/50 px-3 py-3 text-center">{row.status}</td>
                  <td className="border-x border-line/50 px-3 py-3 text-center">{row.accounts_approval_status}</td>
                  <td className="border-x border-line/50 px-3 py-3 text-center">{row.management_status}</td>
                  <td className="border-x border-line/50 px-3 py-3 text-center">{row.payment_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-5 text-[13px] text-ink-secondary">
          <span>Showing {pageStart} to {pageEnd} of {total} entries</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded border border-line bg-white px-3 py-1.5 disabled:opacity-40">Previous</button>
            <span className="px-2 py-1.5">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded border border-line bg-white px-3 py-1.5 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
