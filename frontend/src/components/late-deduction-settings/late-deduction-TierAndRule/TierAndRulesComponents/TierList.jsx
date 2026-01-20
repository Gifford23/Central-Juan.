import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  TextField,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  Typography,
  Divider,
} from "@mui/material";
import { motion } from "framer-motion";
import { Search, Plus, Edit2, Trash2, MoreVertical, Settings } from "lucide-react";

import TierForm from "./TierForm";
import { useTiers } from "../../late-deduction-TierAndRule/late-deduction-TierAndRuleHooks/TierAndRulesHooks";

export default function TierList({ onSelect }) {
  const { tiers = [], addTier, editTier, removeTier } = useTiers();
  const [openForm, setOpenForm] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuTierId, setMenuTierId] = useState(null);
  const [query, setQuery] = useState("");

  const handleAdd = () => {
    setSelectedTier(null);
    setOpenForm(true);
  };

  const handleEdit = (tier) => {
    setSelectedTier(tier);
    setOpenForm(true);
  };

  const handleDelete = (tierId) => {
    if (window.confirm("Delete this tier? This action cannot be undone.")) {
      removeTier(tierId);
    }
  };

  const openMenu = (event, tierId) => {
    setAnchorEl(event.currentTarget);
    setMenuTierId(tierId);
  };
  const closeMenu = () => {
    setAnchorEl(null);
    setMenuTierId(null);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tiers;
    return tiers.filter((t) => {
      return (
        (t.tier_name || "").toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        String(t.id).includes(q)
      );
    });
  }, [tiers, query]);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Typography variant="h6">Late Deduction Tiers</Typography>
          <Typography variant="body2" color="textSecondary">
            Manage your tier groups and rules.
          </Typography>
        </div>

        <div className="flex items-center w-full gap-2 sm:w-auto">
          <Box className="flex items-center flex-1 gap-2 px-3 py-1 bg-white rounded-md shadow-sm sm:flex-initial">
            <Search size={16} />
            <TextField
              size="small"
              placeholder="Search tiers, IDs or descriptions"
              variant="standard"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{ disableUnderline: true }}
              className="flex-1"
              aria-label="Search tiers"
            />
          </Box>

          <Button
            startIcon={<Plus size={16} />}
            variant="contained"
            onClick={handleAdd}
            className="ml-0 sm:ml-2"
          >
            Add Tier
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {(!Array.isArray(filtered) || filtered.length === 0) ? (
        <div className="w-full p-6 text-center border border-dashed rounded-md">
          <Typography>No tiers found.</Typography>
          <div className="mt-3">
            <Button onClick={handleAdd} variant="outlined" startIcon={<Plus size={14} />}>
              Create first tier
            </Button>
          </div>
        </div>
      ) : (
        <List className="w-full bg-transparent divide-y">
          {filtered.map((tier) => {
            const isMenuOpen = menuTierId === tier.id && Boolean(anchorEl);

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.005 }}
              >
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => onSelect && onSelect(tier)}
                    className="px-2 py-3"
                  >
                    <ListItemText
                      primary={
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <Typography className="font-medium truncate">{tier.tier_name}</Typography>
                            <Typography variant="caption" color="textSecondary">ID: {tier.id}</Typography>
                          </div>

                          {/* Actions for desktop */}
                          <div className="hidden sm:flex sm:items-center sm:gap-2">
                            <Button
                              size="small"
                              variant="contained"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelect && onSelect(tier);
                              }}
                              startIcon={<Settings size={14} />}
                            >
                              Manage
                            </Button>

                            <IconButton
                              size="small"
                              aria-label={`edit-${tier.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(tier);
                              }}
                            >
                              <Edit2 size={16} />
                            </IconButton>

                            <IconButton
                              size="small"
                              aria-label={`delete-${tier.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(tier.id);
                              }}
                            >
                              <Trash2 size={16} />
                            </IconButton>
                          </div>

                          {/* Mobile overflow button */}
                          <div className="flex sm:hidden">
                            <IconButton
                              size="small"
                              aria-controls={isMenuOpen ? `tier-menu-${tier.id}` : undefined}
                              aria-haspopup="true"
                              aria-expanded={isMenuOpen ? "true" : undefined}
                              onClick={(e) => {
                                e.stopPropagation();
                                openMenu(e, tier.id);
                              }}
                            >
                              <MoreVertical size={16} />
                            </IconButton>
                          </div>
                        </div>
                      }
                      secondary={tier.description || "—"}
                    />

                    {/* Secondary action kept for accessibility on mobile (hidden on sm) */}
                    <ListItemSecondaryAction className="sm:hidden" />
                  </ListItemButton>
                </ListItem>

                <Divider component="li" />

                {/* Mobile overflow menu */}
                <Menu
                  id={`tier-menu-${tier.id}`}
                  anchorEl={anchorEl}
                  open={isMenuOpen}
                  onClose={(e) => {
                    e.stopPropagation();
                    closeMenu();
                  }}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  <MenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      const t = tiers.find((x) => x.id === menuTierId);
                      closeMenu();
                      onSelect && onSelect(t);
                    }}
                  >
                    <Settings size={14} className="mr-2" /> Manage Rules
                  </MenuItem>

                  <MenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      const t = tiers.find((x) => x.id === menuTierId);
                      closeMenu();
                      handleEdit(t);
                    }}
                  >
                    <Edit2 size={14} className="mr-2" /> Edit
                  </MenuItem>

                  <MenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      closeMenu();
                      handleDelete(menuTierId);
                    }}
                  >
                    <Trash2 size={14} className="mr-2" /> Delete
                  </MenuItem>
                </Menu>
              </motion.div>
            );
          })}
        </List>
      )}

      {/* Tier form modal */}
      {openForm && (
        <TierForm
          open={openForm}
          onClose={() => setOpenForm(false)}
          onSave={(data) => {
            if (data && data.id) {
              editTier(data);
            } else {
              addTier(data);
            }
            setOpenForm(false);
          }}
          initialData={selectedTier}
        />
      )}
    </div>
  );
}





// // src/components/lateDeduction/TierList.jsx
// import React, { useState } from "react";
// import { Button } from "@mui/material";
// import TierForm from "./TierForm";
// import { useTiers } from "../../late-deduction-TierAndRule/late-deduction-TierAndRuleHooks/TierAndRulesHooks";

// const TierList = ({ onSelect }) => {
//   const { tiers, addTier, editTier, removeTier } = useTiers();
//   const [openForm, setOpenForm] = useState(false);
//   const [selectedTier, setSelectedTier] = useState(null);

//   const handleAdd = () => {
//     setSelectedTier(null);
//     setOpenForm(true);
//   };

//   const handleEdit = (tier) => {
//     setSelectedTier(tier);
//     setOpenForm(true);
//   };

//   return (
//     <div className="p-4 bg-white shadow-md rounded-xl">
//       <div className="flex items-center justify-between mb-4">
//         <h2 className="text-xl font-semibold">Late Deduction Tiers</h2>
//         <Button variant="contained" onClick={handleAdd}>
//           + Add Tier
//         </Button>
//       </div>

//       <table className="w-full border">
//         <thead className="bg-gray-100">
//           <tr>
//             <th className="p-2 border">ID</th>
//             <th className="p-2 border">Tier Name</th>
//             <th className="p-2 border">Description</th>
//             <th className="p-2 border">Actions</th>
//           </tr>
//         </thead>
// <tbody>
//   {(Array.isArray(tiers) ? tiers : []).map((tier) => (
//     <tr key={tier.id}>
//       <td className="p-2 border">{tier.id}</td>
//       <td className="p-2 border">{tier.tier_name}</td>
//       <td className="p-2 border">{tier.description}</td>
//       <td className="flex gap-2 p-2 border">
//         <Button size="small" onClick={() => onSelect(tier)}>
//           Manage Rules
//         </Button>
//         <Button size="small" onClick={() => handleEdit(tier)}>
//           Edit
//         </Button>
//         <Button
//           size="small"
//           color="error"
//           onClick={() => removeTier(tier.id)}
//         >
//           Delete
//         </Button>
//       </td>
//     </tr>
//   ))}
// </tbody>

//       </table>

//       {openForm && (
//         <TierForm
//           open={openForm}
//           onClose={() => setOpenForm(false)}
//           onSave={selectedTier ? editTier : addTier}
//           initialData={selectedTier}
//         />
//       )}
//     </div>
//   );
// };

// export default TierList;
