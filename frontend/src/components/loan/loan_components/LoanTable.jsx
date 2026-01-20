// /loans/LoanTable.jsx
import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  Button,
  Typography,
  Skeleton,
  CircularProgress,
  Box,
  TextField,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { ChevronDown, Trash2, Edit, FileText, Search as SearchIcon, X } from "lucide-react";
import Swal from "sweetalert2";
import usePermissions from "../../../users/hooks/usePermissions";
import { useSession } from "../../../context/SessionContext";
import { VariableSizeList as List } from "react-window";

/**
 * LoanTable (virtualized + lazy loading + search)
 *
 * Props:
 * - loans: array of loan objects (currently loaded)
 * - loading: boolean — initial load skeleton
 * - loadMore: async function() — called when near end to load next page
 * - hasMore: boolean — whether there are more items to load
 * - loadingMore: boolean (optional) — parent-controlled loading-more state
 * - onView/onEdit/onDelete/onOpenJournal: same as before
 *
 * NOTE: This version keeps the header/search area visible at all times and
 * shows an inline empty-state below it when no records match the search.
 */

const HEADER_HEIGHT = 72; // px - approximate height of AccordionSummary
const CARD_HEIGHT = 170; // px - estimated height of each loan card
const CARD_GAP = 16; // px - grid gap
const ACCORDION_VERTICAL_PADDING = 32; // px - padding inside details
const BOTTOM_LOADER_HEIGHT = 64;

const LoanTable = ({
  loans = [],
  loading = false,
  loadMore = null,
  hasMore = false,
  loadingMore: loadingMoreProp = undefined,
  onView,
  onEdit,
  onDelete,
  onOpenJournal,
}) => {
  const { user } = useSession();
  const { permissions, loading: permLoading } = usePermissions(user?.username);

  // ---------- search state ----------
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ---------- dedupe by loan_id (keep first) ----------
  const uniqueLoans = useMemo(() => {
    const seen = new Map();
    if (!Array.isArray(loans)) return [];
    for (const l of loans) {
      if (!l || !l.loan_id) continue;
      if (!seen.has(l.loan_id)) seen.set(l.loan_id, l);
    }
    return Array.from(seen.values());
  }, [loans]);

  // ---------- group by employee_id ----------
  const grouped = useMemo(() => {
    const map = new Map();
    for (const loan of uniqueLoans) {
      const empId = loan.employee_id || "UNKNOWN";
      if (!map.has(empId)) {
        map.set(empId, {
          employee_id: empId,
          employee_name: loan.employee_name || empId,
          loans: [],
        });
      }
      map.get(empId).loans.push(loan);
    }
    // convert to array and sort by name
    return Array.from(map.values()).sort((a, b) =>
      (a.employee_name || "").localeCompare(b.employee_name || "")
    );
  }, [uniqueLoans]);

  // ---------- filtered grouped by search ----------
  const filteredGrouped = useMemo(() => {
    if (!debouncedSearch) return grouped;
    const q = debouncedSearch.toLowerCase();
    return grouped.filter((g) => (g.employee_name || "").toLowerCase().includes(q));
  }, [grouped, debouncedSearch]);

  // If searching, we won't trigger lazy loading (makes behavior predictable)
  const isSearching = Boolean(debouncedSearch);

  const formatCurrency = (v) => {
    const n = Number(v || 0);
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleDelete = async (loan) => {
    if (!onDelete) return;
    const confirmed = await Swal.fire({
      title: "Delete loan?",
      html: `<p>Loan ID: <strong>${loan.loan_id}</strong></p><p>Employee: <strong>${loan.employee_name || loan.employee_id}</strong></p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
    });
    if (!confirmed.isConfirmed) return;
    try {
      await onDelete(loan);
      Swal.fire("Deleted", "Loan deleted", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Delete failed", "error");
    }
  };

  // Responsive columns: 1 (mobile), 2 (tablet), 3 (desktop)
  const getColumnsForWidth = useCallback((w) => {
    if (w >= 1024) return 3;
    if (w >= 768) return 2;
    return 1;
  }, []);

  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const columns = getColumnsForWidth(windowWidth);

  // expansion control
  const [expandedIndex, setExpandedIndex] = useState(null);

  // react-window ref
  const listRef = useRef(null);

  // internal loadingMore state if parent doesn't control it
  const [internalLoadingMore, setInternalLoadingMore] = useState(false);
  const loadingMore = typeof loadingMoreProp === "boolean" ? loadingMoreProp : internalLoadingMore;

  // guard to prevent repeated loadMore calls
  const isFetchingRef = useRef(false);
  const lastTriggeredRef = useRef(0);

  // compute row height (works with filteredGrouped)
  const getRowHeight = useCallback(
    (index) => {
      const currentGrouped = filteredGrouped;
      const loaderIndex = currentGrouped.length; // loader appended if hasMore && not searching
      if (hasMore && !isSearching && index === loaderIndex) {
        return BOTTOM_LOADER_HEIGHT;
      }

      // collapsed
      if (expandedIndex !== index) return HEADER_HEIGHT;

      const employee = currentGrouped[index];
      const loanCount = employee?.loans?.length || 0;
      if (loanCount === 0) {
        return HEADER_HEIGHT + 48;
      }

      const cols = columns;
      const rows = Math.ceil(loanCount / cols);
      const gridHeight = rows * CARD_HEIGHT + (rows - 1) * CARD_GAP;
      const total = HEADER_HEIGHT + ACCORDION_VERTICAL_PADDING + gridHeight;
      return Math.min(total, 900);
    },
    [expandedIndex, filteredGrouped, columns, hasMore, isSearching]
  );

  useEffect(() => {
    if (listRef.current) {
      try {
        listRef.current.resetAfterIndex(0, true);
      } catch (err) {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedIndex, columns, filteredGrouped, windowWidth]);

  // onItemsRendered -> detect near-end and call loadMore (disabled while searching)
  const handleItemsRendered = useCallback(
    ({ visibleStartIndex, visibleStopIndex }) => {
      if (isSearching) return; // don't lazy-load while searching

      const currentGrouped = filteredGrouped;
      if (typeof loadMore !== "function") return;
      if (loading) return;

      const now = Date.now();
      if (now - lastTriggeredRef.current < 800) return;
      if (isFetchingRef.current) return;

      const thresholdIndex = Math.max(0, currentGrouped.length - 3);
      if (visibleStopIndex >= thresholdIndex || (hasMore && visibleStopIndex >= currentGrouped.length - 1)) {
        isFetchingRef.current = true;
        lastTriggeredRef.current = now;

        const runLoad = async () => {
          try {
            if (typeof loadingMoreProp !== "boolean") setInternalLoadingMore(true);
            await loadMore();
          } catch (err) {
            console.error("LoanTable: loadMore error", err);
          } finally {
            isFetchingRef.current = false;
            if (typeof loadingMoreProp !== "boolean") setInternalLoadingMore(false);
            if (listRef.current) {
              try {
                listRef.current.resetAfterIndex(0, true);
              } catch (err) {
                // ignore
              }
            }
          }
        };

        void runLoad();
      }
    },
    [filteredGrouped, hasMore, loadMore, loading, isSearching, loadingMoreProp]
  );

  // Row renderer (handles normal rows + optional loader row)
  const Row = ({ index, style }) => {
    const currentGrouped = filteredGrouped;

    // loader row
    if (hasMore && !isSearching && index === currentGrouped.length) {
      return (
        <div style={{ ...style, overflow: "visible" }} className="flex items-center justify-center">
          <div className="p-4">
            {loadingMore ? (
              <div className="flex items-center gap-2">
                <CircularProgress size={18} />
                <div className="text-sm text-gray-600">Loading more...</div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">Scroll to load more</div>
            )}
          </div>
        </div>
      );
    }

    const employee = currentGrouped[index];
    if (!employee) return null;

    // --- more robust active detection: status 'active' OR positive balance
    const activeLoans = employee.loans.filter((l) => {
      const bal = parseFloat(l?.balance ?? 0) || 0;
      const st = String(l?.status ?? "").toLowerCase();
      return st === "active" || bal > 0;
    });

    const displayLoans = activeLoans.length ? activeLoans : employee.loans;

    const isExpanded = expandedIndex === index;

    return (
      <div style={{ ...style, overflow: "visible" }}>
        <Accordion
          expanded={isExpanded}
          onChange={(_, next) => {
            setExpandedIndex(next ? index : null);
            if (listRef?.current) {
              requestAnimationFrame(() => {
                try {
                  listRef.current.resetAfterIndex(index, true);
                } catch (err) {
                  // ignore
                }
              });
            }
          }}
          disableGutters
          className="rounded-lg"
          style={{ position: "relative", zIndex: isExpanded ? 5 : 1 }}
        >
          <AccordionSummary expandIcon={<ChevronDown />} className="px-4 py-3 rounded-t-lg bg-gray-50">
            <div className="flex items-center justify-between w-full">
              <div>
                <Typography className="font-medium">{employee.employee_name}</Typography>
                <Typography variant="body2" className="text-sm text-gray-500">
                  {employee.employee_id}
                </Typography>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-600">
                  {displayLoans.length} {displayLoans.length === 1 ? "loan" : "loans"}
                </div>

                {!permLoading && permissions?.can_view && (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (typeof onOpenJournal === "function") {
                        onOpenJournal({ employee, loans: employee.loans });
                      }
                    }}
                    startIcon={<FileText size={14} />}
                  >
                    Journal
                  </Button>
                )}
              </div>
            </div>
          </AccordionSummary>

          <AccordionDetails className="px-4 pb-4">
            <div
              className={`grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3`}
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              }}
            >
              {displayLoans.map((loan) => {
                const rawStatus = String(loan?.status ?? "").toLowerCase();
                const bal = parseFloat(loan?.balance ?? 0) || 0;

                // priority: explicit status values (active, closed, cancelled, approved, pending, draft)
                // fallback -> use balance to determine active/cleared
                const statusLabelMap = {
                  active: "Active",
                  closed: "Closed",
                  cancelled: "Cancelled",
                  approved: "Approved",
                  pending: "Pending",
                  draft: "Draft",
                };

                let status = statusLabelMap[rawStatus];

                if (!status) {
                  // if no explicit known status, infer from balance
                  status = bal > 0 ? "Active" : "Cleared";
                } else {
                  // If status map gave something but balance contradicts (optional extra safety),
                  // keep explicit status for visibility (e.g., 'closed' should stay closed).
                  // (No extra override here.)
                }

                const statusColorClass = {
                  Active: "text-green-700 bg-green-100",
                  Approved: "text-blue-700 bg-blue-100",
                  Pending: "text-yellow-800 bg-yellow-100",
                  Closed: "text-gray-600 bg-gray-200",
                  Cancelled: "text-red-700 bg-red-100",
                  Cleared: "text-gray-600 bg-gray-200",
                  Draft: "text-gray-600 bg-gray-200",
                };

                const badgeClass = statusColorClass[status] || "text-gray-600 bg-gray-200";

                return (
                  <Card key={loan.loan_id} className="shadow-sm" variant="outlined">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between ">
                        <div>
                          <Typography variant="subtitle1" className="font-semibold">
                            {loan.loan_type ? loan.loan_type.toUpperCase() : "LOAN"}
                          </Typography>
                          <Typography variant="caption" className="text-gray-500">
                            Loan ID: {loan.loan_id}
                          </Typography>

                          <div className="mt-1 text-xs text-gray-500">
                            Type: {(loan.liability_type || "cash_loan").replace("_", " ")}
                          </div>

                          <div className="mt-1 text-xs text-blue-600">
                            Total: ₱{formatCurrency(loan.total_cost ?? loan.loan_amount)}
                          </div>

                          {["sss", "pagibig"].includes(loan.loan_type) && loan.loan_reference_no && (
                            <div className="mt-1 text-xs text-blue-600">Ref: {loan.loan_reference_no}</div>
                          )}
                        </div>

                        <div className="text-right">
                          <div
                            className={`inline-block px-2 py-[2px] rounded-full text-xs ${badgeClass}`}
                          >
                            {status}
                          </div>
                          <div className="mt-1 text-sm font-semibold">₱{formatCurrency(loan.balance)}</div>
                          <div className="text-xs text-gray-500">Balance</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3 text-sm text-gray-700">
                        <div>
                          <div className="text-xs text-gray-500">Original</div>
                          ₱{formatCurrency(loan.loan_amount)}
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Per cutoff</div>
                          ₱{formatCurrency(loan.payable_per_term)}
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Schedule</div>
                          {loan.deduction_schedule}
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Terms</div>
                          {loan.terms || 1}
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        {!permLoading && permissions?.can_view && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => {
                              if (typeof onOpenJournal === "function") onOpenJournal({ employee, loans: [loan] });
                              else if (typeof onView === "function") onView(loan);
                            }}
                            startIcon={<FileText size={14} />}
                          >
                            Journal
                          </Button>
                        )}

                        {!permLoading && permissions?.can_edit && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            onClick={() => onEdit && onEdit(loan)}
                            startIcon={<Edit size={14} />}
                          >
                            Edit
                          </Button>
                        )}

                        {!permLoading && permissions?.can_delete && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleDelete(loan)}
                            startIcon={<Trash2 size={14} />}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </AccordionDetails>
        </Accordion>
      </div>
    );
  };

  // ---------- Loading skeleton (initial) ----------
  if (loading) {
    return (
      <div className="w-full p-6 mt-4 bg-white shadow-md rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Loan Records</h2>
          <div className="flex items-center gap-3">
            {permLoading ? <CircularProgress size={20} /> : null}
            <div className="text-sm text-gray-500">Preparing data...</div>
          </div>
        </div>
        <div className="space-y-4">
          {[0, 1, 2].map((grp) => (
            <div key={grp} className="border border-gray-100 rounded-lg">
              <div className="flex items-center justify-between px-4 py-3 rounded-t-lg bg-gray-50">
                <div>
                  <Skeleton variant="text" width={180} height={28} />
                  <Skeleton variant="text" width={120} height={16} />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton variant="rectangular" width={72} height={32} style={{ borderRadius: 6 }} />
                </div>
              </div>
              <div className="px-4 pb-4">
                <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {[0, 1, 2].map((c) => (
                    <Card key={c} className="shadow-sm" variant="outlined">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <Skeleton variant="text" width={120} height={22} />
                            <Skeleton variant="text" width={90} height={14} />
                            <div className="mt-2">
                              <Skeleton variant="text" width={100} height={14} />
                            </div>
                          </div>
                          <div className="text-right">
                            <Skeleton variant="rectangular" width={72} height={28} style={{ borderRadius: 12 }} />
                            <div className="mt-2">
                              <Skeleton variant="text" width={80} height={18} />
                            </div>
                            <Skeleton variant="text" width={60} height={12} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-3 text-sm text-gray-700">
                          <Skeleton variant="text" width="80%" height={14} />
                          <Skeleton variant="text" width="80%" height={14} />
                          <Skeleton variant="text" width="60%" height={14} />
                          <Skeleton variant="text" width="40%" height={14} />
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Skeleton variant="rectangular" width={100} height={36} style={{ borderRadius: 6 }} />
                          <Skeleton variant="rectangular" width={72} height={36} style={{ borderRadius: 6 }} />
                          <Skeleton variant="rectangular" width={72} height={36} style={{ borderRadius: 6 }} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------- MAIN layout: always render header + search, then either list or empty state ----------
  const listHeight = Math.min(window.innerHeight - 220, 800);
  const itemCount = filteredGrouped.length + (hasMore && !isSearching ? 1 : 0);

  return (
    <div className="w-full p-6 mt-4 space-y-4 bg-white shadow-md rounded-xl">
      <div className="flex items-center justify-between">
        <h2 className="mb-2 text-lg font-semibold text-gray-800">Loan Records</h2>

        {/* right side: search + permission status */}
        <div className="flex items-center gap-3">
          <TextField
            size="small"
            variant="outlined"
            placeholder="Search name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon size={14} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {searchQuery ? (
                    <IconButton size="small" onClick={() => setSearchQuery("")} aria-label="Clear search">
                      <X size={14} />
                    </IconButton>
                  ) : null}
                </InputAdornment>
              ),
            }}
            style={{ width: 260 }}
          />

          {permLoading && (
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress size={20} />
              <Typography variant="caption" className="text-gray-500">
                Checking permissions...
              </Typography>
            </Box>
          )}
        </div>
      </div>

      {/* If no groups match, show an inline empty area that reserves listHeight to avoid layout overlap */}
      {Array.isArray(filteredGrouped) && filteredGrouped.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center w-full p-6 text-center border border-dashed rounded-md"
          style={{ minHeight: listHeight }}
        >
          <Typography variant="h6" className="mb-2 text-gray-600">
            No loan records found.
          </Typography>
          <Typography variant="body2" className="mb-4 text-gray-500">
            Try clearing your search or check for different name/keyword.
          </Typography>
          <div className="flex gap-2">
            {searchQuery ? (
              <Button size="small" variant="contained" onClick={() => setSearchQuery("")}>
                Clear search
              </Button>
            ) : (
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  // helpful hook: focus the search input after clicking
                  setSearchQuery("");
                }}
              >
                Refresh
              </Button>
            )}
          </div>
        </div>
      ) : (
        // Render react-window list only when we have groups (or we're loading more)
        <div>
          <List
            height={listHeight}
            itemCount={itemCount}
            itemSize={(index) => getRowHeight(index)}
            width="100%"
            ref={listRef}
            onItemsRendered={handleItemsRendered}
            style={{ overflowX: "hidden" }}
          >
            {Row}
          </List>
        </div>
      )}
    </div>
  );
};

export default LoanTable;



// // /loans/LoanTable.jsx
// import React, { useMemo } from "react";
// import { Accordion, AccordionSummary, AccordionDetails, Card, CardContent, Button, Typography, IconButton } from "@mui/material";
// import { ChevronDown, Trash2, Edit, FileText } from "lucide-react";
// import Swal from "sweetalert2";
// import usePermissions from "../../../users/hooks/usePermissions";
// import { useSession } from "../../../context/SessionContext";


// const LoanTable = ({ loans = [], onView, onEdit, onDelete, onOpenJournal }) => {
//   const { user } = useSession();
//   const { permissions, loading: permLoading } = usePermissions(user?.username);

//   // dedupe by loan_id (keep first)
//   const uniqueLoans = useMemo(() => {
//     const seen = new Map();
//     if (!Array.isArray(loans)) return [];
//     for (const l of loans) {
//       if (!l || !l.loan_id) continue;
//       if (!seen.has(l.loan_id)) seen.set(l.loan_id, l);
//     }
//     return Array.from(seen.values());
//   }, [loans]);

//   // group by employee_id
//   const grouped = useMemo(() => {
//     const map = new Map();
//     for (const loan of uniqueLoans) {
//       const empId = loan.employee_id || "UNKNOWN";
//       if (!map.has(empId)) {
//         map.set(empId, {
//           employee_id: empId,
//           employee_name: loan.employee_name || empId,
//           loans: [],
//         });
//       }
//       map.get(empId).loans.push(loan);
//     }
//     // convert to array and sort by name
//     return Array.from(map.values()).sort((a, b) =>
//       (a.employee_name || "").localeCompare(b.employee_name || "")
//     );
//   }, [uniqueLoans]);

//   const formatCurrency = (v) => {
//     const n = Number(v || 0);
//     return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
//   };

//   const handleDelete = async (loan) => {
//     if (!onDelete) return;
//     const confirmed = await Swal.fire({
//       title: "Delete loan?",
//       html: `<p>Loan ID: <strong>${loan.loan_id}</strong></p><p>Employee: <strong>${loan.employee_name || loan.employee_id}</strong></p>`,
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonText: "Delete",
//     });
//     if (!confirmed.isConfirmed) return;
//     try {
//       await onDelete(loan);
//       Swal.fire("Deleted", "Loan deleted", "success");
//     } catch (err) {
//       console.error(err);
//       Swal.fire("Error", "Delete failed", "error");
//     }
//   };

//   if (!Array.isArray(loans) || loans.length === 0) {
//     return (
//       <div className="w-full p-6 mt-4 bg-white shadow-md rounded-xl">
//         <div className="p-6 text-center text-gray-500 border border-dashed rounded-lg">
//           No loan records found.
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="w-full p-6 mt-4 space-y-4 bg-white shadow-md rounded-xl">
//       <h2 className="mb-2 text-lg font-semibold text-gray-800">Loan Records</h2>

//       <div className="space-y-4">
//         {grouped.map((employee) => {
//           const activeLoans = employee.loans.filter((l) => Number(l.balance) > 0);
//           const displayLoans = activeLoans.length ? activeLoans : employee.loans;

//           return (
//             <Accordion key={employee.employee_id} className="rounded-lg" disableGutters>
//               <AccordionSummary expandIcon={<ChevronDown />} className="px-4 py-3 rounded-t-lg bg-gray-50">
//                 <div className="flex items-center justify-between w-full">
//                   <div>
//                     <Typography className="font-medium">{employee.employee_name}</Typography>
//                     <Typography variant="body2" className="text-sm text-gray-500">
//                       {employee.employee_id}
//                     </Typography>
//                   </div>

//                   <div className="flex items-center gap-3">
//                     <div className="text-sm text-gray-600">
//                       {displayLoans.length} {displayLoans.length === 1 ? "loan" : "loans"}
//                     </div>

//                     {!permLoading && permissions?.can_view && (
//                       <Button
//                         size="small"
//                         variant="contained"
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           if (typeof onOpenJournal === "function") {
//                             onOpenJournal({ employee, loans: employee.loans });
//                           }
//                         }}
//                         startIcon={<FileText size={14} />}
//                       >
//                         Journal
//                       </Button>
//                     )}
//                   </div>
//                 </div>
//               </AccordionSummary>

//               <AccordionDetails className="px-4 pb-4">
//                 <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
//                   {displayLoans.map((loan) => {
//                     const status = Number(loan.balance) > 0 ? "Active" : "Cleared";
//                     return (
//                       <Card key={loan.loan_id} className="shadow-sm" variant="outlined">
//                         <CardContent className="p-4">
//                           <div className="flex items-start justify-between">
//                             <div>
//                               <Typography variant="subtitle1" className="font-semibold">
//                                 {loan.loan_type ? loan.loan_type.toUpperCase() : "LOAN"}
//                               </Typography>
//                               <Typography variant="caption" className="text-gray-500">
//                                 Loan ID: {loan.loan_id}
//                               </Typography>
//                               {["sss", "pagibig"].includes(loan.loan_type) && loan.loan_reference_no && (
//                                 <div className="mt-1 text-xs text-blue-600">Ref: {loan.loan_reference_no}</div>
//                               )}
//                             </div>

//                             <div className="text-right">
//                               <div className={`inline-block px-2 py-[2px] rounded-full text-xs ${status === "Active" ? "text-green-700 bg-green-100" : "text-gray-600 bg-gray-200"}`}>
//                                 {status}
//                               </div>
//                               <div className="mt-1 text-sm font-semibold">₱{formatCurrency(loan.balance)}</div>
//                               <div className="text-xs text-gray-500">Balance</div>
//                             </div>
//                           </div>

//                           <div className="grid grid-cols-2 gap-2 mt-3 text-sm text-gray-700">
//                             <div>
//                               <div className="text-xs text-gray-500">Original</div>
//                               ₱{formatCurrency(loan.loan_amount)}
//                             </div>
//                             <div>
//                               <div className="text-xs text-gray-500">Per cutoff</div>
//                               ₱{formatCurrency(loan.payable_per_term)}
//                             </div>
//                             <div>
//                               <div className="text-xs text-gray-500">Schedule</div>
//                               {loan.deduction_schedule}
//                             </div>
//                             <div>
//                               <div className="text-xs text-gray-500">Terms</div>
//                               {loan.terms || 1}
//                             </div>
//                           </div>

//                           <div className="flex gap-2 mt-4">
//                             {!permLoading && permissions?.can_view && (
//                               <Button
//                                 size="small"
//                                 variant="contained"
//                                 onClick={() => {
//                                   if (typeof onOpenJournal === "function") onOpenJournal({ employee, loans: [loan] });
//                                   else if (typeof onView === "function") onView(loan);
//                                 }}
//                                 startIcon={<FileText size={14} />}
//                               >
//                                 Journal
//                               </Button>
//                             )}

//                             {!permLoading && permissions?.can_edit && (
//                               <Button size="small" variant="outlined" color="warning" onClick={() => onEdit && onEdit(loan)} startIcon={<Edit size={14} />}>
//                                 Edit
//                               </Button>
//                             )}

//                             {!permLoading && permissions?.can_delete && (
//                               <Button size="small" variant="outlined" color="error" onClick={() => handleDelete(loan)} startIcon={<Trash2 size={14} />}>
//                                 Delete
//                               </Button>
//                             )}
//                           </div>
//                         </CardContent>
//                       </Card>
//                     );
//                   })}
//                 </div>
//               </AccordionDetails>
//             </Accordion>
//           );
//         })}
//       </div>
//     </div>
//   );
// };

// export default LoanTable;



