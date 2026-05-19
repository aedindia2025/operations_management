import { useState } from "react";
import Swal from "sweetalert2";
import PageTopbar from "../../components/common/PageTopbar";
import api from "../../api/axios";
import { showErrorAlert, showWarningAlert } from "../../utils/alerts";

type SaveFileWriter = {
  write: (data: Blob) => Promise<void>;
  close: () => Promise<void>;
};

type SaveFileHandle = {
  createWritable: () => Promise<SaveFileWriter>;
};

type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<SaveFileHandle>;
};

function getSuggestedFilename(fromDate: string, toDate: string) {
  return `completed-po-${fromDate || "from"}-to-${toDate || "to"}.xlsx`;
}

function getFilenameFromResponse(response: Response, fallback: string) {
  const contentDisposition = response.headers.get("content-disposition");
  return getFilenameFromContentDisposition(contentDisposition, fallback);
}

function getFilenameFromHeaders(headers: Record<string, unknown>, fallback: string) {
  const contentDisposition = String(headers["content-disposition"] || headers["Content-Disposition"] || "");
  return getFilenameFromContentDisposition(contentDisposition, fallback);
}

function getFilenameFromContentDisposition(contentDisposition: string | null, fallback: string) {
  if (!contentDisposition) {
    return fallback;
  }

  const encodedMatch = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (encodedMatch?.[1]) {
    return decodeURIComponent(encodedMatch[1].trim().replace(/^"(.*)"$/, "$1"));
  }

  const filenameMatch = contentDisposition.match(/filename\s*=\s*("?)([^";]+)\1/i);
  if (filenameMatch?.[2]) {
    return filenameMatch[2].trim();
  }

  return fallback;
}

async function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function saveWithPicker(blob: Blob, filename: string) {
  const pickerWindow = window as SaveFilePickerWindow;

  if (!pickerWindow.showSaveFilePicker) {
    await triggerBrowserDownload(blob, filename);
    return;
  }

  const handle = await pickerWindow.showSaveFilePicker({
    suggestedName: filename,
    types: [
      {
        description: "Completed PO report",
        accept: {
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
          "application/vnd.ms-excel": [".xls"],
          "application/octet-stream": [".xlsx", ".xls"],
        },
      },
    ],
  });

  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

function supportsSavePicker() {
  const pickerWindow = window as SaveFilePickerWindow;
  return window.isSecureContext && typeof pickerWindow.showSaveFilePicker === "function";
}

async function getDownloadErrorMessage(error: unknown) {
  const fallback = "Failed to download Completed PO report.";
  const responseData = (error as any)?.response?.data;

  if (responseData instanceof Blob) {
    try {
      const text = await responseData.text();
      const payload = JSON.parse(text);
      return payload?.error || payload?.message || payload?.detail || fallback;
    } catch {
      return fallback;
    }
  }

  if (responseData && typeof responseData === "object") {
    return responseData.error || responseData.message || responseData.detail || fallback;
  }

  return error instanceof Error ? error.message : fallback;
}

function getDownloadErrorStatus(error: unknown) {
  return (error as any)?.response?.status;
}

async function showInfoAlert(message: string) {
  return Swal.fire({
    icon: "info",
    title: "Info",
    text: message,
    confirmButtonText: "OK",
    buttonsStyling: false,
    background: "#fffdf7",
    backdrop: "rgba(62, 61, 53, 0.45)",
    customClass: {
      popup: "otm-swal-popup",
      icon: "otm-swal-icon",
      title: "otm-swal-title",
      confirmButton: "otm-swal-confirm",
    },
  });
}

function ExcelIcon() {
  return (
    <svg viewBox="0 0 120 130" xmlns="http://www.w3.org/2000/svg" className="h-28 w-28 drop-shadow-lg">
      <path d="M10 10 L80 10 L110 40 L110 120 L10 120 Z" fill="#f0f0f0" stroke="#cccccc" strokeWidth="1.5" />
      <path d="M80 10 L80 40 L110 40 Z" fill="#d0d0d0" stroke="#cccccc" strokeWidth="1" />
      <rect x="10" y="10" width="70" height="28" rx="2" fill="#1D7044" />
      <text x="45" y="30" textAnchor="middle" fill="white" fontSize="13" fontWeight="900" fontFamily="Arial, sans-serif" letterSpacing="1">
        EXCEL
      </text>
      <rect x="22" y="50" width="76" height="52" rx="2" fill="#217346" />
      <line x1="22" y1="63" x2="98" y2="63" stroke="#1a5c38" strokeWidth="1" />
      <line x1="22" y1="76" x2="98" y2="76" stroke="#1a5c38" strokeWidth="1" />
      <line x1="22" y1="89" x2="98" y2="89" stroke="#1a5c38" strokeWidth="1" />
      <line x1="48" y1="50" x2="48" y2="102" stroke="#1a5c38" strokeWidth="1" />
      <line x1="73" y1="50" x2="73" y2="102" stroke="#1a5c38" strokeWidth="1" />
      <text x="60" y="84" textAnchor="middle" fill="white" fontSize="28" fontWeight="900" fontFamily="Arial, sans-serif" opacity="0.9">
        X
      </text>
      <rect x="52" y="95" width="16" height="18" rx="1" fill="#22c55e" />
      <polygon points="38,113 60,132 82,113" fill="#22c55e" />
      <polygon points="44,113 60,125 76,113" fill="#16a34a" />
      <text x="60" y="148" textAnchor="middle" fill="#374151" fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif">
        Excel
      </text>
    </svg>
  );
}

export default function CompletedPoReport() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showDownload, setShowDownload] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const inputCls =
    "h-[38px] rounded-lg border border-line-dark bg-white px-3 py-2 text-[13px] text-ink outline-none " +
    "focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20";

  const handleGo = async () => {
    if (!fromDate || !toDate) {
      await showWarningAlert("Please select From Date and To Date.");
      return;
    }

    if (fromDate > toDate) {
      await showWarningAlert("From Date should not be greater than To Date.");
      return;
    }

    setShowDownload(true);
  };

  const handleDownload = async () => {
    const fallbackName = getSuggestedFilename(fromDate, toDate);

    try {
      setIsDownloading(true);

      const response = await api.get("/master/completed-po-report/download/", {
        params: { from_date: fromDate, to_date: toDate },
        responseType: "blob",
      });
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
      const filename = getFilenameFromHeaders(response.headers as Record<string, unknown>, fallbackName);
      await saveWithPicker(blob, filename);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      const message = await getDownloadErrorMessage(error);
      if (getDownloadErrorStatus(error) === 404) {
        await showInfoAlert(message);
        return;
      }

      await showErrorAlert(message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f6f7ea_0%,#f9f7ef_35%,#f5f5f0_100%)] p-4 md:p-6">
      <PageTopbar title="Completed PO" breadcrumbs={["Reports", "Completed PO"]} />

      <div className="overflow-hidden rounded-[30px] border border-[#e8e1c7] bg-white shadow-[0_24px_60px_rgba(84,96,28,0.08)]">
        <div className="flex flex-col gap-6 p-5 md:p-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="block text-[12px] font-semibold text-ink-secondary">From Date</span>
              <input name="fromdate"
                type="date"
                value={fromDate}
                onChange={(event) => {
                  setFromDate(event.target.value);
                  setShowDownload(false);
                }}
                className={`${inputCls} w-56`}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="block text-[12px] font-semibold text-ink-secondary">To Date</span>
              <input name="todate"
                type="date"
                value={toDate}
                onChange={(event) => {
                  setToDate(event.target.value);
                  setShowDownload(false);
                }}
                className={`${inputCls} w-56`}
              />
            </div>

            <button
              type="button"
              onClick={() => void handleGo()}
              className="otm-btn-primary-sm self-end"
            >
              GO
            </button>
          </div>

          {showDownload && (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[28px] border border-[#ece5ca] bg-[linear-gradient(180deg,#fffefa_0%,#fbfbf4_100%)]">
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={isDownloading}
                className="group flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-0 bg-transparent p-4 transition-all hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
                title="Download Excel"
              >
                <span className="inline-block transition-transform duration-150 group-hover:scale-105">
                  <ExcelIcon />
                </span>
                <span className="text-[17px] font-bold text-ink transition-colors group-hover:text-brand-700">
                  {isDownloading ? "Preparing Download..." : "Excel Download Here"}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
