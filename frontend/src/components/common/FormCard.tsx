import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface FormCardProps {
  title: string;
  icon?: string;
  cancelLink: string;
  onSave: () => void;
  saving?: boolean;
  isEdit?: boolean;
  children: ReactNode;
}

export default function FormCard({
  title,
  icon = "fa-plus-circle",
  cancelLink,
  onSave,
  saving = false,
  isEdit = false,
  children,
}: FormCardProps) {
  const navigate = useNavigate();
  return (
    <div className="bg-white border border-line rounded-xl shadow-card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-line">
        <i className={`fa ${icon} text-brand-500`}></i>
        <h5 className="font-head font-semibold text-[15px] text-ink m-0">{title}</h5>
      </div>
      <div className="p-5">{children}</div>
      <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-line bg-[#fafaf5]">
        <button onClick={() => navigate(cancelLink)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#f5f5f5] text-ink-secondary
            border border-line text-[13.5px] font-medium rounded cursor-pointer
            hover:bg-line hover:text-ink transition-colors">
          <i className="fa fa-xmark"></i> Cancel
        </button>
        <button onClick={onSave} disabled={saving}
          className="flex items-center gap-1.5 px-5 py-2 bg-success hover:bg-success-dark text-white
            text-[13.5px] font-semibold rounded cursor-pointer transition-colors
            disabled:opacity-60 disabled:cursor-not-allowed border-none">
          {saving ? (
            <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full spin"></span> Saving...</>
          ) : (
            <><i className={`fa ${isEdit ? "fa-floppy-disk" : "fa-check"}`}></i> {isEdit ? "Update" : "Save"}</>
          )}
        </button>
      </div>
    </div>
  );
}
