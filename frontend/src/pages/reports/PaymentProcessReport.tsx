import { useEffect, useState } from "react";
import PageTopbar from "../../components/common/PageTopbar";
import DataTable from "../../components/common/DataTable";
import api from "../../api/axios";

const columns = [
  {
    key: "vendor_name",
    label: "Vendor Name",
    render: (value: string) => (
      <div className="min-w-[170px]">
        <div className="font-semibold text-[#223016]">{value || "-"}</div>
        <div className="mt-1 text-[11px] uppercase tracking-[0.08em] text-[#8b956e]">Verified Vendor</div>
      </div>
    ),
  },
  {
    key: "invoice_amount",
    label: "Invoice Amount",
    render: (value: number | string) => (
      <span className="block min-w-[132px] text-right font-semibold text-[#1e2a12]">
        {formatAmount(value)}
      </span>
    ),
  },
  {
    key: "tds",
    label: "TDS %",
    render: (value: number | string) => (
      <span className="inline-flex min-w-[84px] items-center justify-end rounded-full bg-[#f4efe0] px-3 py-1 text-right font-semibold text-[#6c5b1f]">
        {formatPercent(value)}
      </span>
    ),
  },
  {
    key: "deduction",
    label: "Deduction",
    render: (value: number | string) => (
      <span className="block min-w-[120px] text-right font-medium text-[#8a5a1f]">
        {formatAmount(value)}
      </span>
    ),
  },
  {
    key: "payable_amount",
    label: "Payable Amount",
    render: (value: number | string) => (
      <span className="block min-w-[132px] text-right font-bold text-[#55711f]">
        {formatAmount(value)}
      </span>
    ),
  },
  {
    key: "account_no",
    label: "Account No",
    render: (value: string) => (
      <span className="inline-flex rounded-full bg-[#eef4e3] px-3 py-1 font-medium text-[#39511b]">
        {value || "-"}
      </span>
    ),
  },
  {
    key: "name",
    label: "Name",
    render: (value: string) => <span className="font-medium text-[#2d391f]">{value || "-"}</span>,
  },
  {
    key: "bank_name",
    label: "Bank Name",
    render: (value: string) => <span className="text-[#2d391f]">{value || "-"}</span>,
  },
  {
    key: "ifsc_code",
    label: "IFSC Code",
    render: (value: string) => (
      <span className="inline-flex rounded-full border border-[#dce5c6] bg-white px-3 py-1 font-semibold tracking-wide text-[#5f7427]">
        {value || "-"}
      </span>
    ),
  },
  {
    key: "vendor_bill_created_by",
    label: "Vendor Bill Created By",
    render: (value: string) => (
      <span className="inline-flex items-center gap-2 rounded-full bg-[#f8f6ef] px-3 py-1.5 text-[#36431f]">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6b8231] text-[10px] font-bold text-white">
          {(value || "U").slice(0, 1).toUpperCase()}
        </span>
        <span className="font-medium">{value || "-"}</span>
      </span>
    ),
  },
];

interface ReportSummary {
  vendorCount: number;
  invoiceTotal: number;
  payableTotal: number;
  deductionTotal: number;
}

function formatAmount(value: number | string) {
  const amount = Number(value || 0);
  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number | string) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}%`;
}

export default function PaymentProcessReport() {
  const [summary, setSummary] = useState<ReportSummary>({
    vendorCount: 0,
    invoiceTotal: 0,
    payableTotal: 0,
    deductionTotal: 0,
  });

  useEffect(() => {
    let active = true;

    const loadSummary = async () => {
      try {
        const { data } = await api.post("/master/payment-process-report/list/", {
          draw: 1,
          start: 0,
          length: 10000,
          search: "",
        });

        if (!active) return;

        const rows = Array.isArray(data?.data) ? data.data : [];
        setSummary({
          vendorCount: rows.length,
          invoiceTotal: rows.reduce((sum: number, row: any) => sum + Number(row.invoice_amount || 0), 0),
          payableTotal: rows.reduce((sum: number, row: any) => sum + Number(row.payable_amount || 0), 0),
          deductionTotal: rows.reduce((sum: number, row: any) => sum + Number(row.deduction || 0), 0),
        });
      } catch {
        if (!active) return;
        setSummary({
          vendorCount: 0,
          invoiceTotal: 0,
          payableTotal: 0,
          deductionTotal: 0,
        });
      }
    };

    void loadSummary();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(208,218,173,0.28),_transparent_28%),linear-gradient(180deg,#fbfcf7_0%,#f5f7ef_100%)] p-6">
      <PageTopbar title="Payment Process Report" breadcrumbs={["Reports", "Payment Process Report"]} />

      <section className="mt-4 overflow-visible rounded-[30px] border border-[#e5e8d7] bg-white/90 shadow-[0_28px_70px_rgba(46,61,24,0.10)] backdrop-blur">
        <div className="border-b border-[#ebefdf] bg-[linear-gradient(135deg,#fcfdf8_0%,#edf4e0_50%,#f9f4e6_100%)] px-7 py-7">
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Total Vendors"
              value={String(summary.vendorCount)}
              accent="olive"
              icon="fa-buildings"
            />
            <SummaryCard
              label="Invoice Total"
              value={formatAmount(summary.invoiceTotal)}
              accent="slate"
              icon="fa-file-invoice-dollar"
            />
            <SummaryCard
              label="Deduction Total"
              value={formatAmount(summary.deductionTotal)}
              accent="amber"
              icon="fa-arrow-trend-down"
            />
            <SummaryCard
              label="Payable Total"
              value={formatAmount(summary.payableTotal)}
              accent="green"
              icon="fa-wallet"
            />
          </div>
        </div>

        <div className="p-6">
          <DataTable
            apiUrl="/master/payment-process-report/list/"
            columns={columns}
            exportFileName="payment-process-report"
            exportTitle="Vendor Payment Report"
            showColumnVisibility
            variant="reportModern"
          />
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: string;
  accent: "olive" | "slate" | "amber" | "green";
}) {
  const accentMap = {
    olive: "from-[#f8f6eb] to-[#eef3df] text-[#5d6f25] border-[#e4dfc4]",
    slate: "from-[#f8fafb] to-[#edf2f4] text-[#35515d] border-[#d9e4e8]",
    amber: "from-[#fff8ec] to-[#f8efdb] text-[#8c6119] border-[#ead7aa]",
    green: "from-[#eff7e8] to-[#e4f0da] text-[#3f6c1f] border-[#cfe0bc]",
  } as const;

  return (
    <div
      className={`rounded-[24px] border bg-gradient-to-br p-5 shadow-sm ${accentMap[accent]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-70">{label}</div>
          <div className="mt-3 text-[24px] font-semibold leading-none">{value}</div>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
          <i className={`fa ${icon} text-[18px]`} />
        </div>
      </div>
    </div>
  );
}
