import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { resolveMenuPath } from "../../utils/menuRoutes";
import { fetchPaymentNotifications } from "../../api/notificationApi";
import { isProductOwnerUser } from "../../utils/authAccess";

const GROUP_ICON_MAP: Record<string, string> = {
  Admin: "fa-user-gear",
  Settings: "fa-gear",
  Order: "fa-cart-shopping",
  Purchase: "fa-bag-shopping",
  Stores: "fa-warehouse",
  Operation: "fa-briefcase",
  Accounts: "fa-calculator",
  "Service & Support": "fa-headset",
  Vendor: "fa-truck",
  Reports: "fa-chart-bar",
  Documents: "fa-folder-open",
  "Document Library": "fa-folder-open",
};

const SETTINGS_SCREEN_ORDER = [
  "state_creation",
  "district_creation",
  "city_creation",
  "account_vertical",
  "account_sector",
  "customer_creation",
  "item_creation",
  "service_engineer_creation",
  "vendor_creation",
  "insurance_type",
  "product_creation",
  "product_category",
  "unit_creation",
  "main_category",
  "executive_creation",
  "consignee_creation",
  "pincode_creation",
  "courier_creation",
];

const ADMIN_SCREEN_ORDER = [
  "tenant_creation",
  "user_screen",
  // "main_screen",
  "user_type",
  "user",
  "user_type_permissions",
  "user_permission",
];

const OWNER_ONLY_SCREEN_KEYS = new Set([
  "company_creation",
  "tenant",
  "tenant_creation",
  "tenants",
  "user_screen",
  "user_screen_main",
]);

const HIDDEN_SCREEN_KEYS = new Set([
  "main",
  "main_screen",
  "screen_main",
]);

const OWNER_ONLY_ROUTES = new Set([
  "/admin/tenant-creation/list",
  "/admin/user-screen/list",
]);

const VENDOR_ROUTE_ORDER = [
  "/vendor/bill-creation/list",
  "/vendor/bill-approval/list",
  "/vendor/accounts-bill-entry/list",
  "/vendor/accounts-bill-approval/list",
  "/vendor/management-bill-approval/list",
  "/vendor/payment-transaction/list",
  "/vendor/onsite-engineer-payment/list",
  "/vendor/revisit-payment/list",
];

const STORES_ROUTE_ORDER = [
  "/stores/consignee-stock/list",
  "/stores/invoice-dc/list",
  "/stores/material-qc/list",
  "/stores/dispatch/list",
];

const OPERATION_ROUTE_ORDER = [
  "/operation/approval/list",
  "/operation/vendor-allocation/list",
  "/operation/vendor-allocation-zone/list",
  "/operation/revendor-allocation/list",
  "/operation/delivery/list",
  "/operation/signed-document/list",
];

const REPORT_ROUTE_ORDER = [
  "/reports/po-wise",
  "/reports/completed-po",
  "/reports/overdue-incomplete-po",
  "/reports/payment-process-report",
];

const STATIC_REPORT_SCREENS = [
  {
    unique_id: "static-report-payment-process-report",
    name: "Payment Process Report",
    folder_name: "payment_process_report",
    icon_name: "",
    main_screen_unique_id: "",
    section_unique_id: "",
    actions: [],
  },
];

function normalizeMenuValue(value: string) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function screenRouteKey(screen: { name: string; folder_name: string; unique_id: string }) {
  return resolveMenuPath(screen.name, screen.folder_name) || normalizeMenuValue(screen.folder_name) || normalizeMenuValue(screen.name) || screen.unique_id;
}

function looksLikeFolderLabel(value: string) {
  return /[_/-]/.test(value || "") || normalizeMenuValue(value) === value;
}

function toTitleLabel(value: string) {
  return normalizeMenuValue(value)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function screenDisplayName(screen: { name: string; folder_name: string }) {
  const name = (screen.name || "").trim();
  const folderName = (screen.folder_name || "").trim();
  if (name && !looksLikeFolderLabel(name)) return name;
  if (name && normalizeMenuValue(name) !== normalizeMenuValue(folderName)) return toTitleLabel(name);
  return toTitleLabel(name || folderName) || name || folderName;
}

function appHref(path: string) {
  if (!path) return "";
  const base = import.meta.env.BASE_URL === "/" ? "" : import.meta.env.BASE_URL.replace(/\/+$/, "");
  return `${base}${path}`;
}

const SETTINGS_ORDER_INDEX = new Map(
  SETTINGS_SCREEN_ORDER.map((value, index) => [value, index])
);

const ADMIN_ORDER_INDEX = new Map(
  ADMIN_SCREEN_ORDER.map((value, index) => [value, index])
);

const VENDOR_ROUTE_INDEX = new Map(
  VENDOR_ROUTE_ORDER.map((value, index) => [value, index])
);

const STORES_ROUTE_INDEX = new Map(
  STORES_ROUTE_ORDER.map((value, index) => [value, index])
);

const OPERATION_ROUTE_INDEX = new Map(
  OPERATION_ROUTE_ORDER.map((value, index) => [value, index])
);

const REPORT_ROUTE_INDEX = new Map(
  REPORT_ROUTE_ORDER.map((value, index) => [value, index])
);

const PAYMENT_NOTIFICATION_USER_TYPES = [
  "65efd97b4df4040205",
  "68cba503472bd48995",
];

const normalizeRole = (value?: string) => (value || "").trim().toLowerCase().replace(/[\s_&-]+/g, "");

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [paymentUnreadCount, setPaymentUnreadCount] = useState(0);
  const currentUserId = user?.unique_id || user?.id || "";
  const currentUserType = user?.user_type_unique_id || "";
  const canViewPaymentNotifications = PAYMENT_NOTIFICATION_USER_TYPES.includes(currentUserType) || normalizeRole(user?.role) === "stores";
  const isProductOwner = isProductOwnerUser(user);

  const sourceMenuGroups = Object.values(
    (user?.menus ?? []).reduce<Record<string, NonNullable<typeof user>["menus"][number]>>((acc, group) => {
      const key = normalizeMenuValue(group.name) || group.unique_id;
      const existing = acc[key];
      if (!existing) {
        acc[key] = { ...group, sections: group.sections.map((section) => ({ ...section, screens: [...section.screens] })) };
        return acc;
      }

      const sectionByKey = new Map(
        existing.sections.map((section) => [normalizeMenuValue(section.name) || section.unique_id, section])
      );
      for (const section of group.sections) {
        const sectionKey = normalizeMenuValue(section.name) || section.unique_id;
        const existingSection = sectionByKey.get(sectionKey);
        if (existingSection) {
          existingSection.screens.push(...section.screens);
        } else {
          existing.sections.push({ ...section, screens: [...section.screens] });
        }
      }
      return acc;
    }, {})
  );

  const menuGroups = sourceMenuGroups.map(group => {
    const seenScreens = new Set<string>();
    const flatScreens = group.sections
      .flatMap(section => section.screens)
      .filter((screen) => {
        const key = normalizeMenuValue(screen.folder_name) || normalizeMenuValue(screen.name);
        const path = resolveMenuPath(screen.name, screen.folder_name);
        if (HIDDEN_SCREEN_KEYS.has(key)) return false;
        if (!((!OWNER_ONLY_SCREEN_KEYS.has(key) && !OWNER_ONLY_ROUTES.has(path)) || isProductOwner)) return false;

        const dedupeKey = screenRouteKey(screen);
        if (seenScreens.has(dedupeKey)) return false;
        seenScreens.add(dedupeKey);
        return true;
      });

    if (group.name === "Settings") {
      flatScreens.sort((a, b) => {
        const aKey = normalizeMenuValue(a.folder_name) || normalizeMenuValue(a.name);
        const bKey = normalizeMenuValue(b.folder_name) || normalizeMenuValue(b.name);
        const aIndex = SETTINGS_ORDER_INDEX.get(aKey) ?? Number.MAX_SAFE_INTEGER;
        const bIndex = SETTINGS_ORDER_INDEX.get(bKey) ?? Number.MAX_SAFE_INTEGER;

        if (aIndex !== bIndex) return aIndex - bIndex;
        return screenDisplayName(a).localeCompare(screenDisplayName(b));
      });
    } else if (group.name === "Admin") {
      flatScreens.sort((a, b) => {
        const aKey = normalizeMenuValue(a.folder_name) || normalizeMenuValue(a.name);
        const bKey = normalizeMenuValue(b.folder_name) || normalizeMenuValue(b.name);
        const aIndex = ADMIN_ORDER_INDEX.get(aKey) ?? Number.MAX_SAFE_INTEGER;
        const bIndex = ADMIN_ORDER_INDEX.get(bKey) ?? Number.MAX_SAFE_INTEGER;

        if (aIndex !== bIndex) return aIndex - bIndex;
        return screenDisplayName(a).localeCompare(screenDisplayName(b));
      });
    } else if (group.name === "Vendor") {
      flatScreens.sort((a, b) => {
        const aPath = resolveMenuPath(a.name, a.folder_name);
        const bPath = resolveMenuPath(b.name, b.folder_name);
        const aIndex = VENDOR_ROUTE_INDEX.get(aPath) ?? Number.MAX_SAFE_INTEGER;
        const bIndex = VENDOR_ROUTE_INDEX.get(bPath) ?? Number.MAX_SAFE_INTEGER;

        if (aIndex !== bIndex) return aIndex - bIndex;
        return screenDisplayName(a).localeCompare(screenDisplayName(b));
      });
    } else if (group.name === "Stores") {
      flatScreens.sort((a, b) => {
        const aPath = resolveMenuPath(a.name, a.folder_name);
        const bPath = resolveMenuPath(b.name, b.folder_name);
        const aIndex = STORES_ROUTE_INDEX.get(aPath) ?? Number.MAX_SAFE_INTEGER;
        const bIndex = STORES_ROUTE_INDEX.get(bPath) ?? Number.MAX_SAFE_INTEGER;

        if (aIndex !== bIndex) return aIndex - bIndex;
        return screenDisplayName(a).localeCompare(screenDisplayName(b));
      });
    } else if (group.name === "Operation") {
      flatScreens.sort((a, b) => {
        const aPath = resolveMenuPath(a.name, a.folder_name);
        const bPath = resolveMenuPath(b.name, b.folder_name);
        const aIndex = OPERATION_ROUTE_INDEX.get(aPath) ?? Number.MAX_SAFE_INTEGER;
        const bIndex = OPERATION_ROUTE_INDEX.get(bPath) ?? Number.MAX_SAFE_INTEGER;

        if (aIndex !== bIndex) return aIndex - bIndex;
        return screenDisplayName(a).localeCompare(screenDisplayName(b));
      });
    } else if (group.name === "Reports") {
      const existingPaths = new Set(
        flatScreens.map((screen) => resolveMenuPath(screen.name, screen.folder_name)).filter(Boolean)
      );

      for (const screen of STATIC_REPORT_SCREENS) {
        const path = resolveMenuPath(screen.name, screen.folder_name);
        if (path && !existingPaths.has(path)) {
          flatScreens.push(screen);
          existingPaths.add(path);
        }
      }

      flatScreens.sort((a, b) => {
        const aPath = resolveMenuPath(a.name, a.folder_name);
        const bPath = resolveMenuPath(b.name, b.folder_name);
        const aIndex = REPORT_ROUTE_INDEX.get(aPath) ?? Number.MAX_SAFE_INTEGER;
        const bIndex = REPORT_ROUTE_INDEX.get(bPath) ?? Number.MAX_SAFE_INTEGER;

        if (aIndex !== bIndex) return aIndex - bIndex;
        return screenDisplayName(a).localeCompare(screenDisplayName(b));
      });
    }

    return {
      ...group,
      flatScreens,
    };
  }).filter(group => group.flatScreens.length > 0);

  const toggle = (id: string) =>
    setOpenIds(current => {
      if (current.includes(id)) {
        return current.filter(item => item !== id);
      }
      return [...current, id];
    });

  const isGroupOpen = (id: string) => {
    if (openIds.length === 0 && menuGroups[0]?.unique_id === id) {
      return true;
    }
    return openIds.includes(id);
  };

  const isGroupActive = (group: (typeof menuGroups)[number]) =>
    group.flatScreens.some(screen => {
      const path = resolveMenuPath(screen.name, screen.folder_name);
      return path ? location.pathname.startsWith(path.replace("/list", "")) : false;
    });

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      logout();
      navigate("/login");
    }
  };

  const handleScreenClick = (event: MouseEvent<HTMLAnchorElement>, path: string) => {
    if (!path) {
      event.preventDefault();
      return;
    }

    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    navigate(path);
    onClose();
  };

  useEffect(() => {
    if (!currentUserId || !currentUserType || !canViewPaymentNotifications) {
      setPaymentUnreadCount(0);
      return;
    }

    let active = true;
    const load = async () => {
      try {
        const res = await fetchPaymentNotifications(currentUserId, currentUserType, 20);
        if (!active) return;
        setPaymentUnreadCount(Number(res.unread_count || 0));
      } catch {
        if (!active) return;
        setPaymentUnreadCount(0);
      }
    };

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 5000);
    const onFocus = () => {
      void load();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [currentUserId, currentUserType, canViewPaymentNotifications]);

  return (
    <aside className={`fixed top-3 left-3 bottom-3 w-[236px] rounded-[24px] border border-[#e4e8d7] bg-[linear-gradient(180deg,#fdfef9_0%,#f4f7ed_100%)]
      shadow-[0_28px_65px_rgba(52,67,29,0.12)] flex flex-col z-50 overflow-y-auto transition-transform duration-300
      ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
      <div className="flex items-center justify-between px-4 border-b border-[#e7ecdb] min-h-[66px]">
        <div
          onClick={() => { navigate("/dashboard"); onClose(); }}
          className="flex items-center gap-2 cursor-pointer hover:bg-brand-50 rounded-lg px-1 py-1 transition-colors flex-1 min-w-0">
          <img
            src="/assets/images/ascent-otm.svg"
            alt="Ascent OTM"
            className="max-h-[42px] max-w-[150px] object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-2xl
            text-ink-muted hover:bg-brand-50 hover:text-brand-500 transition-colors
            border-none bg-transparent cursor-pointer flex-shrink-0 ml-2">
          <i className="fa fa-xmark text-base" />
        </button>
      </div>

      <nav className="flex-1 px-2 py-3">
        {menuGroups.map(group => {
          const groupActive = isGroupActive(group);
          const open = isGroupOpen(group.unique_id);

          return (
            <div key={group.unique_id}>
              <div
                onClick={() => toggle(group.unique_id)}
                className={`flex items-center gap-2 rounded-[16px] px-3 py-2.5 cursor-pointer select-none text-[13px] font-medium border transition-all duration-150 ${
                  groupActive
                    ? "bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] text-white border-[#4f7a2b] shadow-[0_16px_30px_rgba(79,122,43,0.24)]"
                    : "text-[#4d5a33] border-transparent hover:bg-white hover:border-[#dce3ca] hover:text-[#4f7a2b]"
                }`}
              >
                <i className={`fa ${GROUP_ICON_MAP[group.name] ?? "fa-folder-tree"} w-[18px] text-center text-[15px] flex-shrink-0`}></i>
                <span className="flex-1">{group.name}</span>
                <i className={`fa fa-chevron-right text-[10px] opacity-50 transition-transform duration-200 ${open ? "rotate-90" : ""}`}></i>
              </div>

              <div className={`${open ? "block" : "hidden"} pl-4`}>
                {group.flatScreens.map(screen => {
                  const path = resolveMenuPath(screen.name, screen.folder_name);
                  const active = path ? location.pathname.startsWith(path.replace("/list", "")) : false;
                  const showPaymentBadge = path === "/vendor/bill-creation/list" && paymentUnreadCount > 0;

                  return (
                    <a
                      key={screen.unique_id}
                      href={path ? appHref(path) : undefined}
                      onClick={(event) => handleScreenClick(event, path)}
                      className={`flex items-center gap-2 rounded-[14px] px-4 py-2 cursor-pointer text-[13px] no-underline transition-all duration-100 ${
                        active
                          ? "text-[#4f7a2b] bg-white border border-[#dce3ca] font-semibold shadow-sm"
                          : "text-[#4d5a33] border-transparent hover:bg-white hover:border-[#dce3ca] hover:text-[#4f7a2b]"
                      }`}
                    >
                      <span className={`w-[6px] flex-shrink-0 rounded-full ${active ? "bg-[#6f9535] h-[6px]" : "bg-current opacity-30 h-[4px]"}`}></span>
                      <span className={`flex-1 ${!path ? "opacity-60" : ""}`}>{screenDisplayName(screen)}</span>
                      {showPaymentBadge ? (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#d9485f] text-white text-[10px] font-bold flex items-center justify-center">
                          {paymentUnreadCount > 99 ? "99+" : paymentUnreadCount}
                        </span>
                      ) : null}
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[#e7ecdb]">
        <div
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-[16px] border border-[#dce3ca] bg-white px-3 py-2.5 cursor-pointer hover:border-[#cbd7ae] hover:bg-[#fbfcf8] transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {(user?.username ?? "U").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-ink truncate">{user?.username ?? "User"}</div>
            <div className="text-[11px] text-ink-muted">Logout</div>
          </div>
          <i className="fa fa-right-from-bracket text-ink-muted text-xs"></i>
        </div>
      </div>
    </aside>
  );
}



