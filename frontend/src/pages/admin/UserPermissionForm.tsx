import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageTopbar from "../../components/common/PageTopbar";
import {
  fetchUserPermissionById,
  fetchUserPermissionMatrix,
  fetchUserPermissionOptions,
  saveUserPermission,
  PermissionMatrixRow,
} from "../../api/userPermissionApi";
import { showErrorAlert, showSuccessAlert, showWarningAlert } from "../../utils/alerts";
import SearchableSelectInput from "../../components/common/SearchableSelectInput";

const COLUMN_ORDER = ["add", "update", "list", "delete", "view", "cancel"];

function normalizeOptionLabel(value: string) {
  return (value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function uniqueOptions(options: Array<{ unique_id: string; label: string }>) {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = normalizeOptionLabel(option.label) || option.unique_id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function UserPermissionForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [userTypes, setUserTypes] = useState<Array<{ unique_id: string; label: string }>>([]);
  const [mainScreens, setMainScreens] = useState<Array<{ unique_id: string; label: string }>>([]);
  const [userType, setUserType] = useState("");
  const [mainScreen, setMainScreen] = useState("");
  const [rows, setRows] = useState<PermissionMatrixRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUserPermissionOptions().then(res => {
      setUserTypes(uniqueOptions(res.data?.user_types ?? []));
      setMainScreens(uniqueOptions(res.data?.main_screens ?? []));
    });
  }, []);

  useEffect(() => {
    if (!isEdit || !id) return;
    fetchUserPermissionById(id).then(res => setUserType(res.data?.user_type ?? id));
  }, [id, isEdit]);

  useEffect(() => {
    if (!userType || !mainScreen) {
      setRows([]);
      return;
    }
    fetchUserPermissionMatrix(userType, mainScreen).then(res => setRows(res.data ?? []));
  }, [userType, mainScreen]);

  const columns = useMemo(() => {
    const map = new Map<string, { key: string; label: string }>();

    rows.forEach(row => {
      row.actions.forEach(action => {
        const key = action.label.trim().toLowerCase();
        if (!key || key === "all" || map.has(key)) return;
        map.set(key, { key, label: action.label.trim() });
      });
    });

    return Array.from(map.values()).sort((left, right) => {
      const leftIndex = COLUMN_ORDER.indexOf(left.key);
      const rightIndex = COLUMN_ORDER.indexOf(right.key);
      if (leftIndex === -1 && rightIndex === -1) return left.label.localeCompare(right.label);
      if (leftIndex === -1) return 1;
      if (rightIndex === -1) return -1;
      return leftIndex - rightIndex;
    });
  }, [rows]);

  const getActionForColumn = (row: PermissionMatrixRow, columnKey: string) =>
    row.actions.find(action => action.label.trim().toLowerCase() === columnKey);

  const toggle = (screenId: string, actionId: string) =>
    setRows(prev =>
      prev.map(row =>
        row.screen_unique_id !== screenId
          ? row
          : {
              ...row,
              actions: row.actions.map(action =>
                action.unique_id === actionId ? { ...action, checked: !action.checked } : action
              ),
            }
      )
    );

  const toggleAll = (screenId: string, checked: boolean) =>
    setRows(prev =>
      prev.map(row =>
        row.screen_unique_id !== screenId
          ? row
          : {
              ...row,
              actions: row.actions.map(action => ({ ...action, checked })),
            }
      )
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userType || !mainScreen) {
      await showWarningAlert("Please select User Type and Main Screen.");
      return;
    }

    setSaving(true);
    const permissions = rows.flatMap(row =>
      row.actions.filter(action => action.checked).map(action => ({
        screen_unique_id: row.screen_unique_id,
        section_unique_id: row.section_unique_id,
        action_unique_id: action.unique_id,
      }))
    );

    try {
      const res = await saveUserPermission({
        unique_id: id,
        user_type: userType,
        main_screen_unique_id: mainScreen,
        permissions,
      });
      if (res.status === 1) {
        await showSuccessAlert(isEdit ? "User permission updated successfully." : "User permission created successfully.");
        navigate(-1);
        return;
      }
      await showErrorAlert(res?.error || "Failed to save user permission.");
    } catch {
      await showErrorAlert("Failed to save user permission.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(204,217,177,0.20),_transparent_30%),linear-gradient(180deg,#fbfcf8_0%,#f5f7ef_100%)] p-6">
      <PageTopbar
        title={isEdit ? "Edit User Permission" : "Add User Permission"}
        breadcrumbs={["Admin", "User Permission", isEdit ? "Edit" : "Add"]}
      />

      <div className="mt-4 rounded-[30px] border border-[#e5e8d7] bg-white shadow-[0_24px_60px_rgba(46,61,24,0.08)]">
        <div className="rounded-t-[30px] border-b border-[#ebefdf] bg-[linear-gradient(135deg,#fcfdf8_0%,#edf4e0_55%,#f9f4e6_100%)] px-7 py-6">
          <h2 className="text-[22px] font-semibold text-[#243018]">
            {isEdit ? "Update User Permission" : "Create User Permission"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <span className="mb-2 block text-sm font-medium text-[#566146]">User Type</span>
              <SearchableSelectInput name="usertype"
                value={userType}
                onChange={e => setUserType(e.target.value)}
                disabled={isEdit}
                className="w-full rounded-2xl border border-[#d7dec8] bg-[#fcfdf9] px-4 py-3 shadow-sm outline-none transition-all focus:border-[#6f9535] focus:ring-4 focus:ring-[#6f9535]/10"
              >
                <option value="">Select User Type</option>
                {userTypes.map(item => (
                  <option key={item.unique_id} value={item.unique_id}>
                    {item.label}
                  </option>
                ))}
              </SearchableSelectInput>
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium text-[#566146]">Main Screen</span>
              <SearchableSelectInput name="mainscreen"
                value={mainScreen}
                onChange={e => setMainScreen(e.target.value)}
                className="w-full rounded-2xl border border-[#d7dec8] bg-[#fcfdf9] px-4 py-3 shadow-sm outline-none transition-all focus:border-[#6f9535] focus:ring-4 focus:ring-[#6f9535]/10"
              >
                <option value="">Select Main Screen</option>
                {mainScreens.map(item => (
                  <option key={item.unique_id} value={item.unique_id}>
                    {item.label}
                  </option>
                ))}
              </SearchableSelectInput>
            </div>

            {rows.length > 0 && (
              <div className="md:col-span-2">
                <div className="overflow-hidden rounded-[24px] border border-[#ddd7bc] shadow-sm">
                  <div className="bg-[linear-gradient(135deg,#f7f4e6_0%,#edf3dd_100%)] px-5 py-4 text-sm font-semibold tracking-[0.14em] text-[#5a6420]">
                    PERMISSIONS
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead className="bg-[#f7f9f0]">
                        <tr>
                          <th className="border-b border-[#d8dec8] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">
                            #
                          </th>
                          <th className="border-b border-[#d8dec8] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">
                            Screen
                          </th>
                          <th className="border-b border-[#d8dec8] px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]">
                            All
                          </th>
                          {columns.map(column => (
                            <th
                              key={column.key}
                              className="border-b border-[#d8dec8] px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c6643]"
                            >
                              {column.label}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {rows.map(row => {
                          const allChecked = row.actions.length > 0 && row.actions.every(action => action.checked);

                          return (
                            <tr
                              key={row.screen_unique_id}
                              className="border-b border-[#edf1e4] odd:bg-[#fffefb] even:bg-[#f9fbf5] hover:bg-[#f1f7e6]"
                            >
                              <td className="px-4 py-3 text-[#243018]">{row.s_no}</td>
                              <td className="px-4 py-3 font-medium text-[#243018]">{row.screen_name}</td>
                              <td className="px-4 py-3 text-center">
                                <input name="allchecked"
                                  type="checkbox"
                                  checked={allChecked}
                                  onChange={e => toggleAll(row.screen_unique_id, e.target.checked)}
                                  className="h-4 w-4 rounded border border-line-dark accent-brand-500"
                                />
                              </td>
                              {columns.map(column => {
                                const action = getActionForColumn(row, column.key);
                                return (
                                  <td key={column.key} className="px-4 py-3 text-center">
                                    {action ? (
                                      <input name="checked"
                                        type="checkbox"
                                        checked={action.checked}
                                        onChange={() => toggle(row.screen_unique_id, action.unique_id)}
                                        className="h-4 w-4 rounded border border-line-dark accent-brand-500"
                                      />
                                    ) : (
                                      <span className="text-gray-300">-</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-[#edf1e4] pt-6">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-2xl border border-[#f0b8a8] bg-[#fff3ef] px-6 py-2.5 font-medium text-[#d45b35] transition-colors hover:bg-[#ffe7df]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !userType || !mainScreen}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#4f7a2b] bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] px-6 py-2.5 font-semibold text-white shadow-[0_12px_24px_rgba(79,122,43,0.24)] transition-all hover:-translate-y-[1px] hover:shadow-[0_16px_28px_rgba(79,122,43,0.30)] disabled:opacity-50"
            >
              {saving ? "Saving..." : isEdit ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
