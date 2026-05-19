import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import {
  fetchSignedDocumentDetail,
  saveSignedDocument,
  type SignedDocumentDetail,
} from "../../api/signedDocumentApi";
import { showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

type DocVerification = "Pending" | "Verified" | "Mismatch/Rejected";

function normalizeReceivedStatus(value: string) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "received" || normalized === "yes") return "Received";
  return "Pending";
}

function buildPoFileUrl(filename: string | null) {
  if (!filename) return "";
  return `/api/master/purchase-order/files/po_copy/${encodeURIComponent(filename)}/`;
}

function buildInstallationFileUrl(filename: string | null) {
  if (!filename) return "";
  return `/api/master/installation/files/${encodeURIComponent(filename)}/`;
}

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyRecord(): SignedDocumentDetail {
  return {
    verificationUniqueId: "",
    consigneeUniqueId: "",
    formMainUniqueId: "",
    insUniqueId: "",
    customerName: "",
    customerAddress: "",
    customerPhone: "--",
    customerEmail: "--",
    consigneeName: "",
    consigneeAddress: "",
    consigneePhone: "--",
    consigneeCity: "",
    poNumber: "",
    poDate: "",
    invoiceNo: "",
    invoiceDate: "",
    dcNumber: "",
    dcDate: "",
    deliveryDate: "",
    dcPodNo: "",
    dcPodDate: "",
    irPodNo: "",
    irPodDate: "",
    snrPodNo: "",
    snrPodDate: "",
    poAttachment: null,
    dcSignedDocument: null,
    installationSignedReport: null,
    items: [],
    dcReceivedStatus: "Pending",
    dcSignedDate: "",
    irReceivedStatus: "Pending",
    irSignedDate: "",
    snrReceivedStatus: "Pending",
    snrSignedDate: "",
    hoReceivedDate: getTodayIsoDate(),
    docVerification: "Pending",
    primaryProductForBg: "",
    processedWithBg: false,
    processedWithoutBg: false,
    rejectReason: "",
    docChn: "",
    sts: "",
    sts1: "",
    sts2: "",
    dcRequired: "",
    snrVerifyStatus: 0,
  };
}

function PdfIcon({ has }: { has: boolean }) {
  return (
    <div
      className={`w-10 h-10 border rounded flex items-center justify-center transition-colors ${
        has ? "bg-red-50 border-red-200 text-red-500 cursor-pointer hover:bg-red-100" : "bg-surface-2 border-line text-ink-muted"
      }`}
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8.5 15.5c-.3 0-.5-.2-.5-.5v-4c0-.3.2-.5.5-.5H10c.8 0 1.5.7 1.5 1.5S10.8 13.5 10 13.5H9v1.5c0 .3-.2.5-.5.5zm1-3H10c.3 0 .5-.2.5-.5s-.2-.5-.5-.5H9.5V12.5zm3 3c-.3 0-.5-.2-.5-.5v-4c0-.3.2-.5.5-.5H13c1.1 0 2 .9 2 2v1c0 1.1-.9 2-2 2h-.5zm.5-4h-.5v3H13c.6 0 1-.4 1-1v-1c0-.6-.4-1-1-1zm3.5 0h-1v1h1c.3 0 .5.2.5.5s-.2.5-.5.5h-1v1.5c0 .3-.2.5-.5.5s-.5-.2-.5-.5v-4c0-.3.2-.5.5-.5H17c.3 0 .5.2.5.5s-.2.5-.5.5z" />
      </svg>
    </div>
  );
}

function CompareIcon() {
  return (
    <div className="flex items-center justify-center w-10 h-10 rounded border border-blue-200 bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors cursor-pointer">
      <i className="fa fa-scale-balanced text-[15px]" />
    </div>
  );
}

function FieldWithCheck({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="block text-[13px] font-semibold text-ink mb-2">{label}</span>
      <div className="relative">{children}</div>
    </div>
  );
}

function CheckMark() {
  return (
    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-500 pointer-events-none">
      <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
        <path d="M4 10l5 5 7-8" stroke="#2d9f6b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function SignedDocumentForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const consigneeUniqueId = searchParams.get("consignee_unique_id") || "";
  const invoiceNo = searchParams.get("invoice_no") || "";
  const dcNumber = searchParams.get("dc_number") || "";
  const insUniqueId = searchParams.get("ins_unique_id") || "";

  const [record, setRecord] = useState<SignedDocumentDetail>(() => createEmptyRecord());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!consigneeUniqueId || !invoiceNo || !dcNumber || !insUniqueId) {
        setLoading(false);
        await showErrorAlert("Signed document record is missing.");
        navigate("/operation/signed-document/list");
        return;
      }

      try {
        const res = await fetchSignedDocumentDetail({ consigneeUniqueId, invoiceNo, dcNumber, insUniqueId });
        if (!active) return;
        if (!res.status) throw new Error(res.message || "Failed to load signed document detail.");
        const emptyRecord = createEmptyRecord();
        setRecord({
          ...emptyRecord,
          ...res.data,
          dcReceivedStatus: normalizeReceivedStatus(res.data.dcReceivedStatus),
          irReceivedStatus: normalizeReceivedStatus(res.data.irReceivedStatus),
          hoReceivedDate: res.data.hoReceivedDate || emptyRecord.hoReceivedDate,
        });
      } catch (error) {
        if (!active) return;
        await showErrorAlert(error instanceof Error ? error.message : "Failed to load signed document detail.");
        navigate("/operation/signed-document/list");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [consigneeUniqueId, dcNumber, insUniqueId, invoiceNo, navigate]);

  const isVerified = record.docVerification === "Verified";
  const isMismatch = record.docVerification === "Mismatch/Rejected";
  const isIrFlow =
    String(record.sts1 || "").trim().toUpperCase() === "IR" ||
    String(record.dcRequired || "").trim() === "1";
  const reportLabel = isIrFlow ? "IR Signed Document" : "SNR Signed Document";
  const reportCompareLabel = isIrFlow ? "PO IR Comparison" : "PO SNR Comparison";
  const dcReportCompareLabel = isIrFlow ? "DC IR Comparison" : "DC SNR Comparison";
  const reportPodNoLabel = isIrFlow ? "IR Pod No" : "SNR Pod No";
  const reportPodDateLabel = isIrFlow ? "IR Pod Date" : "SNR Pod Date";
  const reportStatusLabel = isIrFlow ? "IR Received Status" : "SNR Status";
  const reportSignedDateLabel = isIrFlow ? "IR Signed Date" : "SNR Signed Date";
  const reportStatusValue = isIrFlow ? record.irReceivedStatus : record.snrReceivedStatus;
  const reportSignedDateValue = isIrFlow ? record.irSignedDate : record.snrSignedDate;
  const poAttachmentUrl = buildPoFileUrl(record.poAttachment);
  const dcSignedDocumentUrl = buildInstallationFileUrl(record.dcSignedDocument);
  const installationReportUrl = buildInstallationFileUrl(
    isIrFlow ? record.installationSignedReport || record.dcSignedDocument : record.installationSignedReport
  );

  const inputClass =
    "w-full px-3.5 py-2.5 text-[13px] border border-brand-500 rounded-lg outline-none bg-white text-ink focus:ring-2 focus:ring-brand-500/15 transition-all appearance-none pr-10";

  const selectClass =
    "w-full px-3.5 py-2.5 text-[13px] border border-brand-500 rounded-lg outline-none bg-white text-ink appearance-none pr-10 cursor-pointer focus:ring-2 focus:ring-brand-500/15 transition-all";

  const handleSave = async () => {
    if (isMismatch && !record.rejectReason.trim()) {
      await showErrorAlert("Reject reason is required.");
      return;
    }
    if (isVerified && record.processedWithBg && !record.primaryProductForBg.trim()) {
      await showErrorAlert("Primary product for BG is required.");
      return;
    }

    setSaving(true);
    try {
      const res = await saveSignedDocument(record);
      if (!res.status) throw new Error(res.message || "Failed to save signed document verification.");
      setRecord((prev) => ({ ...prev, verificationUniqueId: res.verificationUniqueId || prev.verificationUniqueId }));
      await showSuccessAlert(record.verificationUniqueId ? "Signed document verification updated successfully." : "Signed document verification created successfully.");
      navigate("/operation/signed-document/list");
    } catch (error) {
      await showErrorAlert(error instanceof Error ? error.message : "Failed to save signed document verification.");
    } finally {
      setSaving(false);
    }
  };

  const openPdf = (title: string, url: string) => {
    if (!url) return;
    const resolvedUrl = new URL(url, window.location.origin).toString();
    const win = window.open("", "_blank", "width=1200,height=900,scrollbars=yes,resizable=yes");
    if (!win) return;
    win.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            html, body { margin: 0; height: 100%; background: #2f2f2f; }
            .wrap { height: 100%; display: flex; flex-direction: column; }
            .head { padding: 12px 16px; background: #fff; font: 600 14px sans-serif; }
            iframe { flex: 1; border: 0; width: 100%; background: #2f2f2f; }
          </style>
        </head>
        <body>
          <div class="wrap">
            <div class="head">${title}</div>
            <iframe src="${resolvedUrl}"></iframe>
          </div>
        </body>
      </html>
    `);
    win.document.close();
  };

  const openCompare = (title: string, leftTitle: string, leftUrl: string, rightTitle: string, rightUrl: string) => {
    if (!leftUrl || !rightUrl) return;
    const resolvedLeftUrl = new URL(leftUrl, window.location.origin).toString();
    const resolvedRightUrl = new URL(rightUrl, window.location.origin).toString();
    const win = window.open("", "_blank", "width=1600,height=950,scrollbars=yes,resizable=yes");
    if (!win) return;
    win.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            html, body { margin: 0; height: 100%; background: #1f1f1f; font-family: sans-serif; }
            .wrap { height: 100%; display: flex; flex-direction: column; }
            .head { padding: 12px 16px; background: #fff; font: 600 14px sans-serif; text-align: center; }
            .grid { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: #cfcfcf; }
            .panel { display: flex; flex-direction: column; background: #fff; min-height: 0; }
            .label { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 600; }
            iframe { flex: 1; border: 0; width: 100%; background: #2f2f2f; }
          </style>
        </head>
        <body>
          <div class="wrap">
            <div class="head">${title}</div>
            <div class="grid">
              <div class="panel">
                <div class="label">${leftTitle}</div>
                <iframe src="${resolvedLeftUrl}"></iframe>
              </div>
              <div class="panel">
                <div class="label">${rightTitle}</div>
                <iframe src="${resolvedRightUrl}"></iframe>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f6f7ea_0%,#f9f7ef_35%,#f5f5f0_100%)] p-6">
      <PageTopbar
        title="Signed Document Verification"
        breadcrumbs={["Operation", "Signed Document Verification"]}
      />

      <div className="overflow-visible rounded-[30px] border border-[#e8e1c7] bg-white shadow-[0_24px_60px_rgba(84,96,28,0.08)]">
        <div className="p-6 md:p-8">
          {loading ? (
            <div className="py-10 text-center text-[13px] text-ink-muted">Loading...</div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-2 pb-8 border-b border-line">
                <div>
                  <p className="text-[11px] font-semibold text-ink-muted tracking-widest uppercase mb-3">Customer Details</p>
                  <h2 className="text-[18px] font-extrabold text-[#3d5a20] leading-tight mb-3">{record.customerName}</h2>
                  <p className="text-[13px] text-ink-secondary leading-relaxed mb-3 whitespace-pre-line">{record.customerAddress}</p>
                  <p className="flex items-center gap-1.5 text-[13px] text-ink mb-1">
                    <i className="fa fa-phone text-[11px] text-ink-muted" />
                    {record.customerPhone}
                  </p>
                  <p className="flex items-center gap-1.5 text-[13px] text-ink">
                    <i className="fa fa-envelope text-[11px] text-ink-muted" />
                    {record.customerEmail}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-ink-muted tracking-widest uppercase mb-3">Consignee Details</p>
                  <h2 className="text-[18px] font-extrabold text-[#3d5a20] leading-tight mb-3">{record.consigneeName}</h2>
                  <p className="flex items-center gap-1.5 text-[13px] text-ink mb-3">
                    <i className="fa fa-phone text-[11px] text-ink-muted" />
                    {record.consigneePhone}
                  </p>
                  <p className="text-[13px] text-ink-secondary leading-relaxed mb-1 whitespace-pre-line">{record.consigneeAddress}</p>
                  <p className="text-[13px] text-ink-secondary leading-relaxed">{record.consigneeCity}</p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-ink-muted tracking-widest uppercase mb-3">PO &amp; Invoice Details</p>
                  <table className="w-full text-[13px]">
                    <tbody>
                      {[
                        { label: "PO Number", value: record.poNumber },
                        { label: "PO Date", value: record.poDate },
                        { label: "Invoice No", value: record.invoiceNo },
                        { label: "Invoice Date", value: record.invoiceDate },
                        { label: "DC Number", value: record.dcNumber },
                        { label: "DC Date", value: record.dcDate },
                        { label: "Delivery Date", value: record.deliveryDate },
                        { label: "DC Pod No", value: record.dcPodNo },
                        { label: "DC Pod Date", value: record.dcPodDate },
                        { label: reportPodNoLabel, value: isIrFlow ? record.irPodNo : record.snrPodNo },
                        { label: reportPodDateLabel, value: isIrFlow ? record.irPodDate : record.snrPodDate },
                      ].map(({ label, value }) => (
                        <tr key={label} className="align-top">
                          <td className="py-1 pr-2 text-ink-muted whitespace-nowrap w-[110px]">{label}</td>
                          <td className="py-1 pr-2 text-ink-muted text-center w-4">:</td>
                          <td className="py-1 text-ink font-medium">{value || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mb-2 pb-6 border-b border-line">
                <h3 className="text-[15px] font-bold text-ink mb-5">Attachment</h3>
                <div className="flex flex-wrap items-start divide-x divide-line">
                  <div className="flex flex-col items-start gap-2 pr-10">
                    <span className="text-[13px] text-ink-secondary">PO Attachment</span>
                    <button type="button" onClick={() => openPdf("PO Attachment", poAttachmentUrl)} disabled={!poAttachmentUrl}>
                      <PdfIcon has={Boolean(poAttachmentUrl)} />
                    </button>
                  </div>
                  <div className="flex flex-col items-start gap-2 px-10">
                    <span className="text-[13px] text-ink-secondary">DC Signed Document</span>
                    <button type="button" onClick={() => openPdf("DC Signed Document", dcSignedDocumentUrl)} disabled={!dcSignedDocumentUrl}>
                      <PdfIcon has={Boolean(dcSignedDocumentUrl)} />
                    </button>
                  </div>
                  <div className="flex flex-col items-start gap-2 pl-10">
                    <span className="text-[13px] text-ink-secondary">{reportLabel}</span>
                    <button type="button" onClick={() => openPdf(reportLabel, installationReportUrl)} disabled={!installationReportUrl}>
                      <PdfIcon has={Boolean(installationReportUrl)} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mb-2 pb-6 border-b border-line">
                <h3 className="text-[15px] font-bold text-ink mb-5">Comparison</h3>
                <div className="flex flex-wrap items-start divide-x divide-line">
                  <div className="flex flex-col items-start gap-2 pr-10">
                    <span className="text-[13px] text-ink-secondary">PO DC Comparison</span>
                    <button
                      type="button"
                      onClick={() => openCompare("PO & DC Comparison Attachment", "PO Attachment", poAttachmentUrl, "DC Attachment", dcSignedDocumentUrl)}
                      disabled={!poAttachmentUrl || !dcSignedDocumentUrl}
                    >
                      <CompareIcon />
                    </button>
                  </div>
                  <div className="flex flex-col items-start gap-2 px-10">
                    <span className="text-[13px] text-ink-secondary">{reportCompareLabel}</span>
                    <button
                      type="button"
                      onClick={() => openCompare(`${reportCompareLabel} Attachment`, "PO Attachment", poAttachmentUrl, reportLabel, installationReportUrl)}
                      disabled={!poAttachmentUrl || !installationReportUrl}
                    >
                      <CompareIcon />
                    </button>
                  </div>
                  <div className="flex flex-col items-start gap-2 pl-10">
                    <span className="text-[13px] text-ink-secondary">{dcReportCompareLabel}</span>
                    <button
                      type="button"
                      onClick={() => openCompare(`${dcReportCompareLabel} Attachment`, "DC Signed Document", dcSignedDocumentUrl, reportLabel, installationReportUrl)}
                      disabled={!dcSignedDocumentUrl || !installationReportUrl}
                    >
                      <CompareIcon />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FieldWithCheck label="DC Received status">
                    <SearchableSelectInput name="dcreceivedstatus"
                      value={record.dcReceivedStatus}
                      onChange={(e) => setRecord((prev) => ({ ...prev, dcReceivedStatus: e.target.value }))}
                      className={selectClass}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Received">Received</option>
                    </SearchableSelectInput>
                    <CheckMark />
                  </FieldWithCheck>

                  <FieldWithCheck label="DC Signed Date">
                    <input name="dcsigneddate"
                      type="date"
                      value={record.dcSignedDate}
                      onChange={(e) => setRecord((prev) => ({ ...prev, dcSignedDate: e.target.value }))}
                      className={inputClass}
                    />
                    <CheckMark />
                  </FieldWithCheck>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FieldWithCheck label={reportStatusLabel}>
                    <SearchableSelectInput name="reportstatusvalue"
                      value={reportStatusValue}
                      onChange={(e) =>
                        setRecord((prev) => ({
                          ...prev,
                          ...(isIrFlow ? { irReceivedStatus: e.target.value } : { snrReceivedStatus: e.target.value }),
                        }))
                      }
                      className={selectClass}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Received">Received</option>
                    </SearchableSelectInput>
                    <CheckMark />
                  </FieldWithCheck>

                  <FieldWithCheck label={reportSignedDateLabel}>
                    <input name="reportsigneddatevalue"
                      type="date"
                      value={reportSignedDateValue}
                      onChange={(e) =>
                        setRecord((prev) => ({
                          ...prev,
                          ...(isIrFlow ? { irSignedDate: e.target.value } : { snrSignedDate: e.target.value }),
                        }))
                      }
                      className={inputClass}
                    />
                    <CheckMark />
                  </FieldWithCheck>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FieldWithCheck label="HO Received Date">
                    <input name="horeceiveddate"
                      type="date"
                      value={record.hoReceivedDate}
                      onChange={(e) => setRecord((prev) => ({ ...prev, hoReceivedDate: e.target.value }))}
                      className={inputClass}
                    />
                    <CheckMark />
                  </FieldWithCheck>

                  <FieldWithCheck label="Doc. Verification">
                    <SearchableSelectInput name="docverification"
                      value={record.docVerification}
                      onChange={(e) =>
                        setRecord((prev) => ({
                          ...prev,
                          docVerification: e.target.value as DocVerification,
                          rejectReason: e.target.value === "Mismatch/Rejected" ? prev.rejectReason : "",
                          primaryProductForBg: e.target.value === "Verified" ? prev.primaryProductForBg : "",
                          processedWithBg: e.target.value === "Verified" ? prev.processedWithBg : false,
                          processedWithoutBg: e.target.value === "Verified" ? prev.processedWithoutBg : false,
                        }))
                      }
                      className={selectClass}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Verified">Verified</option>
                      <option value="Mismatch/Rejected">Mismatch/Rejected</option>
                    </SearchableSelectInput>
                    <CheckMark />
                  </FieldWithCheck>
                </div>

                {isVerified && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div>
                      <span className="block text-[13px] font-semibold text-ink mb-2">Primary Product For BG</span>
                      <div className="relative">
                        <input name="primaryproductforbg"
                          type="text"
                          value={record.primaryProductForBg}
                          onChange={(e) => setRecord((prev) => ({ ...prev, primaryProductForBg: e.target.value }))}
                          className={`w-full px-3.5 py-2.5 text-[13px] border rounded-lg outline-none bg-white text-ink transition-all pr-10 ${
                            record.processedWithBg && !record.primaryProductForBg.trim()
                              ? "border-red-400 focus:ring-2 focus:ring-red-400/20"
                              : "border-brand-500 focus:ring-2 focus:ring-brand-500/15"
                          }`}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-7">
                      <label className={`flex items-center gap-2.5 select-none ${record.processedWithoutBg ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}>
                        <input name="processedwithbg"
                          type="checkbox"
                          checked={record.processedWithBg}
                          disabled={record.processedWithoutBg}
                          onChange={(e) =>
                            setRecord((prev) => ({
                              ...prev,
                              processedWithBg: e.target.checked,
                              processedWithoutBg: e.target.checked ? false : prev.processedWithoutBg,
                            }))
                          }
                          className="w-4 h-4 accent-brand-500 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <span className="text-[13px] font-medium text-brand-600">Processed With BG</span>
                      </label>
                      <label className={`flex items-center gap-2.5 select-none ${record.processedWithBg ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}>
                        <input name="processedwithoutbg"
                          type="checkbox"
                          checked={record.processedWithoutBg}
                          disabled={record.processedWithBg}
                          onChange={(e) =>
                            setRecord((prev) => ({
                              ...prev,
                              processedWithoutBg: e.target.checked,
                              processedWithBg: e.target.checked ? false : prev.processedWithBg,
                            }))
                          }
                          className="w-4 h-4 accent-brand-500 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <span className="text-[13px] font-medium text-brand-600">Processed Without BG</span>
                      </label>
                    </div>
                  </div>
                )}

                {isMismatch && (
                  <div className="w-full md:w-1/2">
                    <span className="block text-[13px] font-semibold text-ink mb-2">Reject Reason</span>
                    <textarea name="rejectreason"
                      rows={4}
                      value={record.rejectReason}
                      onChange={(e) => setRecord((prev) => ({ ...prev, rejectReason: e.target.value }))}
                      className={`w-full px-3.5 py-2.5 text-[13px] border rounded-lg outline-none bg-white text-ink resize-y transition-all ${
                        !record.rejectReason ? "border-red-400 focus:ring-2 focus:ring-red-400/20" : "border-brand-500 focus:ring-2 focus:ring-brand-500/15"
                      }`}
                    />
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="px-6 py-2 text-[13px] font-semibold rounded-lg cursor-pointer transition-colors bg-red-500 hover:bg-red-600 text-white border-0"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={
                      saving ||
                      (isVerified && record.processedWithBg && !record.primaryProductForBg.trim()) ||
                      (isMismatch && !record.rejectReason.trim())
                    }
                    className="px-6 py-2 text-[13px] font-semibold rounded-lg cursor-pointer transition-colors bg-brand-700 hover:bg-brand-800 text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {saving ? "Saving..." : record.verificationUniqueId ? "Update" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


