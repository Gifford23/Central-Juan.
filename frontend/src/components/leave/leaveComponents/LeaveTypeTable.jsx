import React, { useState, useEffect } from "react";
import {
  IconButton,
  Typography,
  Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useSession } from "../../../context/SessionContext";
import usePermissions from "../../../users/hooks/usePermissions";

const LeaveTypeTable = ({ leaveTypes = [], onEdit, onDelete }) => {
  const { user } = useSession();
  const { permissions, loading: permLoading } = usePermissions(user?.username);

  // track which cards are expanded on mobile
  const [openIds, setOpenIds] = useState(new Set());

  // Expand everything on larger screens for a better desktop UX
  useEffect(() => {
    const applyResponsiveOpen = () => {
      if (typeof window === "undefined") return;
      if (window.innerWidth >= 768) {
        // open all
        setOpenIds(new Set(leaveTypes.map((t) => t.leave_type_id)));
      } else {
        // collapse all on small screens
        setOpenIds(new Set());
      }
    };
    applyResponsiveOpen();
    window.addEventListener("resize", applyResponsiveOpen);
    return () => window.removeEventListener("resize", applyResponsiveOpen);
  }, [leaveTypes]);

  const toggleOpen = (id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!Array.isArray(leaveTypes) || leaveTypes.length === 0) {
    return (
      <div className="p-4 bg-white rounded shadow-md">
        <Typography variant="h6" gutterBottom>
          Leave Types
        </Typography>
        <p className="text-sm text-gray-500">No leave types available.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded shadow-md">
      <Typography variant="h6" gutterBottom>
        Leave Types
      </Typography>

      <div className="flex flex-col gap-3">
        {leaveTypes.map((type) => {
          const isOpen = openIds.has(type.leave_type_id);
          return (
            <article
              key={type.leave_type_id}
              className="p-4 transition bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-800 truncate sm:text-lg">
                    {type.leave_name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 sm:hidden">
                    {/* show short summary on mobile */}
                    {type.description ? `${type.description.substring(0, 100)}${type.description.length > 100 ? "…" : ""}` : "-"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Actions (visible always but buttons respect permissions) */}
                  {!permLoading && permissions?.can_edit && (
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => onEdit(type)}
                        aria-label={`Edit ${type.leave_name}`}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}

                  {!permLoading && permissions?.can_delete && (
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onDelete(type.leave_type_id)}
                        aria-label={`Delete ${type.leave_name}`}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}

                  {/* Toggle details on small screens (hidden on md+) */}
                  <button
                    type="button"
                    onClick={() => toggleOpen(type.leave_type_id)}
                    className="p-1 ml-1 text-gray-600 rounded-md hover:bg-gray-100 focus:outline-none md:hidden"
                    aria-expanded={isOpen}
                    aria-controls={`leave-detail-${type.leave_type_id}`}
                    aria-label={isOpen ? "Collapse details" : "Expand details"}
                  >
                    {isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </button>
                </div>
              </div>

              {/* Details: visible on md+ OR when toggled open on mobile */}
              <div
                id={`leave-detail-${type.leave_type_id}`}
                className={`mt-3 text-sm text-gray-700 transition-all ${
                  isOpen ? "block" : "hidden"
                } md:block`}
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">Paid</span>
                    <span className="mt-1 font-medium">{type.is_paid ? "Yes" : "No"}</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">Default Days</span>
                    <span className="mt-1 font-medium">{type.default_days ?? "-"}</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">Leave Limit (per year)</span>
                    <span className="mt-1 font-medium">{type.leave_limit ?? "-"}</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">Description</span>
                    <span className="mt-1">{type.description || "-"}</span>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default LeaveTypeTable;

