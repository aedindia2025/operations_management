import { useState, useEffect, useRef } from "react";
import PageTopbar from "../../components/common/PageTopbar";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

const API = "/api/master";

const DOC_TYPES = [
  { label: "Unsigned DC",      value: "unsigned_dc" },
  { label: "Unsigned IR",      value: "unsigned_ir" },
  { label: "Invoice",          value: "inv" },
  { label: "PO",               value: "po" },
  { label: "POD Proof",        value: "podproof" },
  { label: "Delivery Proof",   value: "deliveryproof" },
  { label: "E-Invoice",        value: "einvoice" },
  { label: "Signed DC",        value: "signed_dc" },
  { label: "Signed IR",        value: "signed_ir" },
  { label: "Signed SNR",       value: "signed_snr" },
];

interface DocFile { name: string; exists: boolean; folder: string; }
interface OptionItem { label: string; value: string; }

export default function POWiseDocument() {
  const [customers,  setCustomers]  = useState<OptionItem[]>([]);
  const [poNumbers,  setPoNumbers]  = useState<OptionItem[]>([]);
  const [states,     setStates]     = useState<OptionItem[]>([]);
  const [districts,  setDistricts]  = useState<OptionItem[]>([]);
  const [zones,      setZones]      = useState<OptionItem[]>([]);
  const [files,      setFiles]      = useState<DocFile[]>([]);

  const [customer,   setCustomer]   = useState("");
  const [poId,       setPoId]       = useState("");
  const [docType,    setDocType]    = useState("");
  const [state,      setState]      = useState("");
  const [district,   setDistrict]   = useState("");
  const [zone,       setZone]       = useState("");

  const [search,     setSearch]     = useState("");
  const [selected,   setSelected]   = useState<string[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [fetched,    setFetched]    = useState(false);
  const [zonesLoaded, setZonesLoaded] = useState(false);
  const filesCacheRef = useRef<Record<string, DocFile[]>>({});

  const selectCls =
    "h-[38px] w-full rounded-lg border border-line-dark bg-white px-3 py-2 text-[13px] text-ink outline-none " +
    "focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-[#f7f7f1] disabled:text-ink-muted";

  const fetchZones = (poValue: string, stateValue = "", districtValue = "") => {
    const params = new URLSearchParams({ po_id: poValue });
    if (stateValue) params.set("state", stateValue);
    if (districtValue) params.set("district", districtValue);
    fetch(`${API}/po-wise-document/zones/?${params.toString()}`)
      .then(r => r.json())
      .then(data => setZones(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  const handlePoChange = (value: string) => {
    setPoId(value);
    setState("");
    setDistrict("");
    setZone("");
    setStates([]);
    setDistricts([]);
    setZones([]);
    setZonesLoaded(false);
    setFiles([]);
    setSelected([]);
    setFetched(false);
  };

  // Load customers on mount
  useEffect(() => {
    fetch(`${API}/po-wise-document/customers/`)
      .then(r => r.json()).then(setCustomers).catch(console.error);
  }, []);

  // Customer ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ PO numbers
  useEffect(() => {
    setPoNumbers([]); setPoId(""); setStates([]); setState("");
    setDistricts([]); setDistrict(""); setZones([]); setZone("");
    setFiles([]); setFetched(false);
    if (!customer) return;
    fetch(`${API}/po-wise-document/po-numbers/?customer=${encodeURIComponent(customer)}`)
      .then(r => r.json()).then(setPoNumbers).catch(console.error);
  }, [customer]);

  // PO ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ States
  useEffect(() => {
    setStates([]); setDistricts([]); setZones([]);
    setFiles([]); setSelected([]); setFetched(false);
    setZonesLoaded(false);
    if (!poId) return;
    fetch(`${API}/po-wise-document/states/?po_id=${poId}`)
      .then(r => r.json()).then(data => setStates(Array.isArray(data) ? data : [])).catch(console.error);
  }, [poId]);

  // State ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Districts
  useEffect(() => {
    setDistricts([]); setDistrict(""); setZones([]); setZone("");
    setFiles([]); setSelected([]); setFetched(false);
    setZonesLoaded(false);
    if (!poId) return;
    if (!state) return;
    fetch(`${API}/po-wise-document/districts/?po_id=${poId}&state=${encodeURIComponent(state)}`)
      .then(r => r.json()).then(data => setDistricts(Array.isArray(data) ? data : [])).catch(console.error);
  }, [poId, state]);

  // District ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Zones
  useEffect(() => {
    if (!poId || !state) return;
    setZones([]); setZone(""); setFiles([]); setSelected([]); setFetched(false); setZonesLoaded(false);
  }, [district]);

  const ensureZonesLoaded = () => {
    if (!poId || zonesLoaded) return;
    fetchZones(poId, state, district);
    setZonesLoaded(true);
  };

  // GO button
  const handleGo = async () => {
    if (!poId)    { alert("Please select PO No");        return; }
    if (!docType) { alert("Please select Document Type"); return; }
    if (zone && (state || district)) {
      alert("Select either State and District or Zone.");
      return;
    }
    setLoading(true); setFiles([]); setSelected([]); setFetched(false);
    const params = new URLSearchParams({
      po_id: poId, doc_type: docType,
      ...(state    && { state }),
      ...(district && { district }),
      ...(zone     && { zone }),
    });
    const cacheKey = params.toString();
    if (filesCacheRef.current[cacheKey]) {
      setFiles(filesCacheRef.current[cacheKey]);
      setFetched(true);
      setLoading(false);
      return;
    }
    const data = await fetch(`${API}/po-wise-document/files/?${params}`)
      .then(r => r.json()).catch(() => []);
    const normalized = Array.isArray(data) ? data : [];
    filesCacheRef.current[cacheKey] = normalized;
    setFiles(normalized);
    setFetched(true);
    setLoading(false);
  };

  // Select / deselect
  const filtered = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  const allSelected = filtered.length > 0 && filtered.every(f => selected.includes(f.name));

  const toggleFile = (name: string) =>
    setSelected(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);

  const handleSelectAll = () =>
    allSelected ? setSelected([]) : setSelected(filtered.map(f => f.name));

  // Download
  const handleDownload = async () => {
    if (!selected.length) return;
    const res = await fetch(`${API}/po-wise-document/download/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc_type: docType, selected_files: selected }),
    });
    if (!res.ok) { alert("Download failed"); return; }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = selected.length === 1 ? selected[0] : `${docType}_files.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f6f7ea_0%,#f9f7ef_35%,#f5f5f0_100%)] p-4 md:p-6">
      <PageTopbar title="PO Wise Document" breadcrumbs={["Reports", "PO Wise Document"]} />

      <div className="relative z-10 overflow-visible rounded-[30px] border border-[#e8e1c7] bg-white shadow-[0_24px_60px_rgba(84,96,28,0.08)]">
        <div className="flex flex-col gap-6 p-5 md:p-6">

          {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Filters ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
          <div className="relative z-30 grid grid-cols-1 gap-4 text-[13px] md:grid-cols-2 xl:grid-cols-4">

            {/* Customer */}
            <div className="flex flex-col gap-1.5">
              <span className="block text-[12px] font-semibold text-ink-secondary">Customer Name</span>
              <SearchableSelectInput name="customer" className={selectCls} value={customer} onChange={e => setCustomer(e.target.value)}>
                <option value="">Select Customer</option>
                {customers.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </SearchableSelectInput>
            </div>

            {/* PO No */}
            <div className="flex flex-col gap-1.5">
              <span className="block text-[12px] font-semibold text-ink-secondary">PO No</span>
              <SearchableSelectInput name="poid" className={selectCls} value={poId} onChange={e => handlePoChange(e.target.value)} disabled={!customer}>
                <option value="">Select PO</option>
                {poNumbers.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </SearchableSelectInput>
            </div>

            {/* Document Type */}
            <div className="flex flex-col gap-1.5">
              <span className="block text-[12px] font-semibold text-ink-secondary">Document Type</span>
              <SearchableSelectInput name="doctype" className={selectCls} value={docType} onChange={e => setDocType(e.target.value)}>
                <option value="">Select Type</option>
                {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </SearchableSelectInput>
            </div>

            {/* State */}
            <div className="flex flex-col gap-1.5">
              <span className="block text-[12px] font-semibold text-ink-secondary">State</span>
              <SearchableSelectInput name="state" className={selectCls} value={state} onChange={e => setState(e.target.value)} disabled={!poId}>
                <option value="">Select State</option>
                {states.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </SearchableSelectInput>
            </div>

            {/* District */}
            <div className="flex flex-col gap-1.5">
              <span className="block text-[12px] font-semibold text-ink-secondary">District</span>
              <SearchableSelectInput name="district" className={selectCls} value={district} onChange={e => setDistrict(e.target.value)} disabled={!state}>
                <option value="">Select District</option>
                {districts.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </SearchableSelectInput>
            </div>

            {/* Zone */}
            <div className="flex flex-col gap-1.5">
              <span className="block text-[12px] font-semibold text-ink-secondary">Zone</span>
              <SearchableSelectInput name="zone" className={selectCls} value={zone} onChange={e => setZone(e.target.value)} onFocus={ensureZonesLoaded} disabled={!poId}>
                <option value="">Select Zone</option>
                {zones.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
              </SearchableSelectInput>
            </div>

            {/* GO */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleGo}
                disabled={loading}
                className="otm-btn-primary-sm disabled:cursor-wait disabled:opacity-60"
              >
                {loading ? "Loading..." : "GO"}
              </button>
            </div>
          </div>

          {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ File List ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
          {fetched && (
            <>
              <div className="flex flex-col gap-3 border-t border-[#eee6cc] pt-5 text-[13px] sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink">Available Files</span>
                  <span className="rounded-full bg-brand-600 px-2.5 py-1 text-[12px] font-semibold text-white">
                    {filtered.length}
                  </span>
                </div>
                <input name="search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by file name..."
                  className="h-[38px] w-full rounded-lg border border-line-dark bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 sm:w-72"
                />
              </div>

              {filtered.length === 0 ? (
                <div className="rounded-[24px] border border-[#ece5ca] bg-[linear-gradient(180deg,#fffefa_0%,#fbfbf4_100%)] px-5 py-10 text-center text-[13px] text-ink-muted">
                  No files found.
                </div>
              ) : (
                <>
                  <label className="flex w-fit items-center gap-2 text-[13px] font-medium text-ink">
                    <input name="allselected" type="checkbox" checked={allSelected} onChange={handleSelectAll} className="h-4 w-4 accent-brand-700" />
                    <span>Select All ({filtered.length})</span>
                  </label>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6">
                    {filtered.map(file => (
                      <div
                        key={file.name}
                        onClick={() => toggleFile(file.name)}
                        className={`cursor-pointer rounded-2xl border p-4 text-center transition
                          ${selected.includes(file.name)
                            ? "border-brand-500 bg-brand-50 shadow-[0_14px_32px_rgba(84,96,28,0.12)]"
                            : "border-[#ece5ca] bg-white hover:bg-[#fffdf5]"}
                          ${!file.exists ? "opacity-40" : ""}`}
                      >
                        <input name="powisedocument_input_294"
                          type="checkbox"
                          checked={selected.includes(file.name)}
                          className="mb-2 h-4 w-4 accent-brand-700"
                          readOnly
                        />
                        <div className="mb-2 text-2xl text-[#d97706]">
                          <i className="fa fa-file-image" />
                        </div>
                        <div className="truncate text-[12px] font-medium text-ink" title={file.name}>
                          {file.name}
                        </div>
                        {!file.exists && (
                          <div className="mt-1 text-[10px] font-semibold text-red-500">Missing</div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={selected.length === 0}
                      className="otm-btn-primary-sm disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Download Selected ({selected.length})
                    </button>
                  </div>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}


