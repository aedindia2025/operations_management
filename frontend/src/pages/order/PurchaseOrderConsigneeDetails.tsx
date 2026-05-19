import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import { fetchPurchaseOrderById, fetchPurchaseOrderConsignees, fetchPurchaseOrderOptions, updatePurchaseOrderConsignee, updatePurchaseOrderConsigneeBatchDate } from "../../api/purchaseOrderApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

type ConsigneeRow = Record<string, any>;
type Option = { unique_id: string; label: string; state_name?: string };

function formatDate(value?: string) {
  if (!value) return "-";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [y, m, d] = value.slice(0, 10).split("-");
    return `${d}-${m}-${y}`;
  }
  return value;
}

export default function PurchaseOrderConsigneeDetails() {
  const navigate = useNavigate();
  const { id = "", batchId = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [poDate, setPoDate] = useState("");
  const [poNum, setPoNum] = useState("");
  const [rows, setRows] = useState<ConsigneeRow[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editRow, setEditRow] = useState<ConsigneeRow | null>(null);
  const [receivedDate, setReceivedDate] = useState("");
  const [options, setOptions] = useState<{ states: Option[]; districts: Option[]; executives: Option[]; teamMembers: Option[] }>({
    states: [],
    districts: [],
    executives: [],
    teamMembers: [],
  });

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!id || !batchId) return;
      setLoading(true);
      try {
        const [poRes, consigneeRes, optionRes] = await Promise.all([
          fetchPurchaseOrderById(id),
          fetchPurchaseOrderConsignees(id),
          fetchPurchaseOrderOptions(),
        ]);
        if (ignore) return;
        if (!poRes.status || !consigneeRes.status || !optionRes.status) throw new Error();
        setPoDate(poRes.data?.po_date || "");
        setPoNum(poRes.data?.po_num || "");
        const filteredRows =
          Array.isArray(consigneeRes.data)
            ? consigneeRes.data.filter((row) => row.batch_id === batchId)
            : [];
        setRows(filteredRows);
        setReceivedDate(filteredRows[0]?.consignee_received_date?.slice?.(0, 10) || "");
        setOptions({
          states: optionRes.data?.states || [],
          districts: optionRes.data?.districts || [],
          executives: optionRes.data?.executives || [],
          teamMembers: optionRes.data?.team_members || [],
        });
      } catch {
        if (!ignore) void showErrorAlert("Failed to load consignee batch details.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [id, batchId]);

  const tableRows = useMemo(() => rows, [rows]);
  const districtOptions = useMemo(
    () => options.districts.filter((row) => !editRow?.con_state_name || row.state_name === editRow.con_state_name),
    [options.districts, editRow?.con_state_name]
  );

  function setEditField(field: string, value: string) {
    setEditRow((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  async function reloadRows() {
    const consigneeRes = await fetchPurchaseOrderConsignees(id);
    if (!consigneeRes.status) throw new Error();
    const filteredRows = Array.isArray(consigneeRes.data)
      ? consigneeRes.data.filter((row: ConsigneeRow) => row.batch_id === batchId)
      : [];
    setRows(filteredRows);
    setReceivedDate(filteredRows[0]?.consignee_received_date?.slice?.(0, 10) || "");
  }

  async function handleSaveEdit() {
    if (!editRow?.unique_id) return;
    setSaving(true);
    try {
      const res = await updatePurchaseOrderConsignee(editRow.unique_id, editRow);
      if (!res.status) throw new Error();
      await showSuccessAlert("Consignee updated successfully.");
      setShowEditModal(false);
      setEditRow(null);
      await reloadRows();
    } catch {
      await showErrorAlert("Failed to update consignee.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveReceivedDate() {
    if (!receivedDate) {
      await showErrorAlert("Please select consignee received date.");
      return;
    }
    setSaving(true);
    try {
      const res = await updatePurchaseOrderConsigneeBatchDate(id, batchId, { consignee_received_date: receivedDate });
      if (!res.status) throw new Error();
      await showSuccessAlert("Consignee received date updated successfully.");
      setShowDateModal(false);
      await reloadRows();
    } catch {
      await showErrorAlert("Failed to update consignee received date.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageTopbar title="Consignee List" breadcrumbs={["Order", "Purchase Order", "Consignee List"]} />

      <section className="bg-white border border-line rounded-2xl shadow-card p-5 space-y-5">
        <div className="flex justify-between items-center gap-4">
          <div className="text-sm text-danger">
            If Change Consignee Received Date
            <button
              type="button"
              onClick={() => setShowDateModal(true)}
              className="ml-3 px-4 py-2 text-sm font-semibold bg-brand-700 text-white rounded-md hover:bg-brand-800"
            >
              Click Here
            </button>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/order/purchase-order/form/${id}`)}
            className="px-4 py-2 text-sm font-semibold bg-brand-700 text-white rounded-md hover:bg-brand-800"
          >
            Back
          </button>
        </div>

        <div className="overflow-x-auto border border-line rounded-xl">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="bg-surface-2">
                {[
                  "ID",
                  "Con. Name/Branch",
                  "Con Branch Code",
                  "Con. Address",
                  "Con. Email Id",
                  "Billing Address",
                  "Billing Gst No",
                  "Region",
                  "State",
                  "District",
                  "Zone",
                  "Zone Code",
                  "Pincode",
                  "Contact Name",
                  "Contact Number",
                  "Alternate Name",
                  "Alternate Number",
                  "Landline",
                  "GST",
                  "Assigned Team Member",
                  "Status",
                  "Action",
                ].map((header) => (
                  <th key={header} className="px-3 py-2 border border-line-dark text-left whitespace-nowrap">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={22} className="px-3 py-8 border border-line text-center text-ink-muted">Loading...</td>
                </tr>
              ) : tableRows.length === 0 ? (
                <tr>
                  <td colSpan={22} className="px-3 py-8 border border-line text-center text-ink-muted">No consignee rows found for batch {batchId}.</td>
                </tr>
              ) : tableRows.map((row, index) => (
                <tr key={row.unique_id || index} className="hover:bg-brand-50/30">
                  <td className="px-3 py-2 border border-line">{index + 1}</td>
                  <td className="px-3 py-2 border border-line">{row.con_branch || "-"}</td>
                  <td className="px-3 py-2 border border-line">{row.con_branch_code || "-"}</td>
                  <td className="px-3 py-2 border border-line min-w-[280px]">{row.con_address || "-"}</td>
                  <td className="px-3 py-2 border border-line">{row.cons_email_id || "-"}</td>
                  <td className="px-3 py-2 border border-line min-w-[180px]">{row.billing_address || "-"}</td>
                  <td className="px-3 py-2 border border-line">{row.billing_gst_no || "-"}</td>
                  <td className="px-3 py-2 border border-line">{row.region || "-"}</td>
                  <td className="px-3 py-2 border border-line">{row.state_name_display || "-"}</td>
                  <td className="px-3 py-2 border border-line">{row.district_name_display || "-"}</td>
                  <td className="px-3 py-2 border border-line">{row.zone || "-"}</td>
                  <td className="px-3 py-2 border border-line">{row.zone_code || "-"}</td>
                  <td className="px-3 py-2 border border-line">{row.con_pincode || "-"}</td>
                  <td className="px-3 py-2 border border-line">{row.con_contact_name || "-"}</td>
                  <td className="px-3 py-2 border border-line">{row.con_contact_number || "-"}</td>
                  <td className="px-3 py-2 border border-line">{row.alter_contact_name || "-"}</td>
                  <td className="px-3 py-2 border border-line">{row.alter_number || "-"}</td>
                  <td className="px-3 py-2 border border-line">{row.con_lan_num || "-"}</td>
                  <td className="px-3 py-2 border border-line">{row.consignee_gst || "-"}</td>
                  <td className="px-3 py-2 border border-line">{row.assigned_team_member_display || row.assign_team_member || row.team_mem || "-"}</td>
                  <td className="px-3 py-2 border border-line">
                    {String(row.cons_verify_sts) === "1" ? "Verified" : "Not Verified"}
                  </td>
                  <td className="px-3 py-2 border border-line">
                    <button
                      type="button"
                      onClick={() => {
                        setEditRow({ ...row });
                        setShowEditModal(true);
                      }}
                      className="w-10 h-10 inline-flex items-center justify-center rounded border border-[#2942a0] text-[#2942a0] hover:bg-[#2942a0] hover:text-white"
                    >
                      <i className="fa fa-pen-to-square" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-sm text-ink-muted">
          Batch ID: <span className="font-semibold text-ink">{batchId}</span>
          {poDate ? <> | PO Date: <span className="font-semibold text-ink">{formatDate(poDate)}</span></> : null}
        </div>
      </section>

      {showDateModal && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-surface-2 border-b border-line flex items-center justify-between">
              <h3 className="text-xl font-bold text-brand-700">Update Consignee Received Date</h3>
              <button type="button" onClick={() => setShowDateModal(false)} className="text-2xl text-ink-muted hover:text-ink">×</button>
            </div>
            <div className="p-6 space-y-5">
              <div><span className="font-semibold text-ink-secondary">PO No:</span> <span className="ml-2 text-ink">{poNum || "-"}</span></div>
              <div><span className="font-semibold text-ink-secondary">Batch ID:</span> <span className="ml-2 text-ink">{batchId}</span></div>
              <div>
                <span className="block text-sm font-semibold text-brand-700 mb-2">Consignee Received Date:</span>
                <input name="receiveddate"
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-line-dark rounded-md outline-none focus:border-brand-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-line flex justify-end gap-3">
              <button type="button" onClick={() => setShowDateModal(false)} className="px-4 py-2 text-sm font-semibold bg-danger text-white rounded-md hover:bg-danger-dark">Close</button>
              <button type="button" onClick={() => void handleSaveReceivedDate()} disabled={saving} className="px-4 py-2 text-sm font-semibold bg-brand-700 text-white rounded-md hover:bg-brand-800 disabled:opacity-60">{saving ? "Submitting..." : "Submit"}</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editRow && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="w-full max-w-6xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-line flex items-center justify-between">
              <h3 className="text-xl font-bold text-ink">Edit Consignee</h3>
              <button type="button" onClick={() => { setShowEditModal(false); setEditRow(null); }} className="text-2xl text-ink-muted hover:text-ink">×</button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-4">
                <div className="space-y-4">
                  <label className="block text-sm">Consignee Name/Branch<input name="con_branch" value={editRow.con_branch || ""} onChange={(e) => setEditField("con_branch", e.target.value)} className="mt-1 w-full px-3 py-2 border border-line-dark rounded-md" /></label>
                  <label className="block text-sm">Consignee Branch Code<input name="con_branch_code" value={editRow.con_branch_code || ""} onChange={(e) => setEditField("con_branch_code", e.target.value)} className="mt-1 w-full px-3 py-2 border border-line-dark rounded-md" /></label>
                  <label className="block text-sm">Con. Address<textarea name="con_address" value={editRow.con_address || ""} onChange={(e) => setEditField("con_address", e.target.value)} className="mt-1 w-full px-3 py-2 border border-line-dark rounded-md min-h-[96px]" /></label>
                  <label className="block text-sm">Con. Email Id<input name="cons_email_id" value={editRow.cons_email_id || ""} onChange={(e) => setEditField("cons_email_id", e.target.value)} className="mt-1 w-full px-3 py-2 border border-line-dark rounded-md" /></label>
                  <label className="block text-sm">Billing Address<textarea name="billing_address" value={editRow.billing_address || ""} onChange={(e) => setEditField("billing_address", e.target.value)} className="mt-1 w-full px-3 py-2 border border-line-dark rounded-md min-h-[96px]" /></label>
                  <label className="block text-sm">Billing Gst No<input name="billing_gst_no" value={editRow.billing_gst_no || ""} onChange={(e) => setEditField("billing_gst_no", e.target.value)} className="mt-1 w-full px-3 py-2 border border-line-dark rounded-md" /></label>
                  <label className="block text-sm">Region<input name="region" value={editRow.region || ""} onChange={(e) => setEditField("region", e.target.value)} className="mt-1 w-full px-3 py-2 border border-line-dark rounded-md" /></label>
                  <label className="block text-sm">State
                    <SearchableSelectInput name="con_state_name" value={editRow.con_state_name || ""} onChange={(e) => { setEditField("con_state_name", e.target.value); setEditField("con_district", ""); }} className="mt-1 w-full px-3 py-2 border border-line-dark rounded-md">
                      <option value="">Select State</option>
                      {options.states.map((row) => <option key={row.unique_id} value={row.unique_id}>{row.label}</option>)}
                    </SearchableSelectInput>
                  </label>
                  <label className="block text-sm">District
                    <SearchableSelectInput name="con_district" value={editRow.con_district || ""} onChange={(e) => setEditField("con_district", e.target.value)} className="mt-1 w-full px-3 py-2 border border-line-dark rounded-md">
                      <option value="">Select District</option>
                      {districtOptions.map((row) => <option key={row.unique_id} value={row.unique_id}>{row.label}</option>)}
                    </SearchableSelectInput>
                  </label>
                  <label className="block text-sm">Zone<input name="zone" value={editRow.zone || ""} onChange={(e) => setEditField("zone", e.target.value)} className="mt-1 w-full px-3 py-2 border border-line-dark rounded-md" /></label>
                  <label className="block text-sm">Zone Code<input name="zone_code" value={editRow.zone_code || ""} onChange={(e) => setEditField("zone_code", e.target.value)} className="mt-1 w-full px-3 py-2 border border-line-dark rounded-md" /></label>
                </div>
                <div className="space-y-4">
                  <label className="block text-sm">Pincode<input name="con_pincode" value={editRow.con_pincode || ""} onChange={(e) => setEditField("con_pincode", e.target.value)} className="mt-1 w-full px-3 py-2 border border-line-dark rounded-md" /></label>
                  <label className="block text-sm">Contact Name<input name="con_contact_name" value={editRow.con_contact_name || ""} onChange={(e) => setEditField("con_contact_name", e.target.value)} className="mt-1 w-full px-3 py-2 border border-line-dark rounded-md" /></label>
                  <label className="block text-sm">Contact Number<input name="con_contact_number" value={editRow.con_contact_number || ""} onChange={(e) => setEditField("con_contact_number", e.target.value)} className="mt-1 w-full px-3 py-2 border border-line-dark rounded-md" /></label>
                  <label className="block text-sm">Alternate Name<input name="alter_contact_name" value={editRow.alter_contact_name || ""} onChange={(e) => setEditField("alter_contact_name", e.target.value)} className="mt-1 w-full px-3 py-2 border border-line-dark rounded-md" /></label>
                  <label className="block text-sm">Alternate Number<input name="alter_number" value={editRow.alter_number || ""} onChange={(e) => setEditField("alter_number", e.target.value)} className="mt-1 w-full px-3 py-2 border border-line-dark rounded-md" /></label>
                  <label className="block text-sm">Landline<input name="con_lan_num" value={editRow.con_lan_num || ""} onChange={(e) => setEditField("con_lan_num", e.target.value)} className="mt-1 w-full px-3 py-2 border border-line-dark rounded-md" /></label>
                  <label className="block text-sm">GST<input name="consignee_gst" value={editRow.consignee_gst || ""} onChange={(e) => setEditField("consignee_gst", e.target.value)} className="mt-1 w-full px-3 py-2 border border-line-dark rounded-md" /></label>
                  <label className="block text-sm">Assigned Team Member
                    <SearchableSelectInput name="team_mem" value={editRow.team_mem || ""} onChange={(e) => setEditField("team_mem", e.target.value)} className="mt-1 w-full px-3 py-2 border border-line-dark rounded-md">
                      <option value="">Select Team Member</option>
                      {options.teamMembers.map((row) => <option key={row.unique_id} value={row.unique_id}>{row.label}</option>)}
                    </SearchableSelectInput>
                  </label>
                  <label className="block text-sm">Status
                    <SearchableSelectInput name="cons_verify_sts" value={String(editRow.cons_verify_sts ?? "")} onChange={(e) => setEditField("cons_verify_sts", e.target.value)} className="mt-1 w-full px-3 py-2 border border-line-dark rounded-md">
                      <option value="1">Verified</option>
                      <option value="0">Not Verified</option>
                    </SearchableSelectInput>
                  </label>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-line flex justify-end gap-3">
              <button type="button" onClick={() => { setShowEditModal(false); setEditRow(null); }} className="px-4 py-2 text-sm font-semibold bg-danger text-white rounded-md hover:bg-danger-dark">Close</button>
              <button type="button" onClick={() => void handleSaveEdit()} disabled={saving} className="px-4 py-2 text-sm font-semibold bg-brand-700 text-white rounded-md hover:bg-brand-800 disabled:opacity-60">{saving ? "Saving..." : "Update"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




