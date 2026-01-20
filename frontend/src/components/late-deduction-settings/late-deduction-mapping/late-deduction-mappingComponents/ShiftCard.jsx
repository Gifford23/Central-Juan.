// ShiftCard.jsx
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Chip,
  Button,
  Box,
  Stack,
  Tooltip,
  useTheme,
  useMediaQuery,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { AccessTime, Edit, Delete, MoreVert } from "@mui/icons-material";

/**
 * ShiftCard
 *
 * Props:
 * - shift: object (shift.shift_name, shift.tier_name, shift.start_time, shift.end_time, etc.)
 * - onEdit(shift)
 * - onRemove(shift)
 * - onOpen?(shift)  // optional card click handler
 */
export default function ShiftCard({ shift = {}, onEdit = () => {}, onRemove = () => {}, onOpen = null }) {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down("sm"));

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const name = shift.shift_name || "Untitled shift";
  const tier = shift.tier_name || null;
  const start = shift.start_time || "";
  const end = shift.end_time || "";

  const handleMenuOpen = (e) => setMenuAnchor(e.currentTarget);
  const handleMenuClose = () => setMenuAnchor(null);

  const confirmRemove = () => {
    setConfirmOpen(true);
    handleMenuClose();
  };

  const doRemove = () => {
    setConfirmOpen(false);
    // pass full shift object back to parent — caller can use id or whole object
    onRemove(shift);
  };

  const timeDisplay = (start || end) ? `${start || "--"} ${start && end ? "—" : ""} ${end || ""}`.trim() : null;

  return (
    <>
      <Card
        elevation={3}
        sx={{
          borderRadius: 2,
          display: "flex",
          flexDirection: "column",
          overflow: "visible",
          minWidth: 0,
          transition: "transform .12s ease, box-shadow .12s ease",
          "&:hover": { transform: "translateY(-4px)", boxShadow: 6 },
        }}
      >
        {/* Make the main body clickable (optional) but keep action buttons separate */}
        <Box display="flex" alignItems="stretch" gap={2} p={1.25}>
          <CardActionArea
            onClick={() => onOpen ? onOpen(shift) : null}
            sx={{
              flex: 1,
              borderRadius: 1,
              px: 1,
              py: 0.5,
              display: "flex",
              alignItems: "flex-start",
              textAlign: "left",
              minWidth: 0,
            }}
            disableRipple={!onOpen}
          >
            <Box mr={1} display="flex" alignItems="center" sx={{ minWidth: 0 }}>
              <AccessTime color="action" sx={{ fontSize: 20 }} />
            </Box>

            <CardContent sx={{ p: 0, minWidth: 0 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: "0.95rem", sm: "1rem" },
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={name}
              >
                {name}
              </Typography>

              {timeDisplay && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                  {timeDisplay}
                </Typography>
              )}

              <Box mt={1} display="flex" alignItems="center" gap={1} flexWrap="wrap">
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
                  Tier:
                </Typography>

                {tier ? (
                  <Chip
                    label={tier}
                    size="small"
                    sx={{
                      height: 26,
                      fontSize: 12,
                      px: 0.8,
                      bgcolor: (t) => t.palette.primary.light,
                      color: (t) => t.palette.primary.contrastText,
                    }}
                  />
                ) : (
                  <Chip label="Unassigned" variant="outlined" size="small" sx={{ height: 26, fontSize: 12 }} />
                )}
              </Box>
            </CardContent>
          </CardActionArea>

          {/* Actions area */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              ml: 0.5,
              // keep actions from wrapping into main content
              flexShrink: 0,
              minWidth: isSm ? 36 : 110,
            }}
          >
            {/* On md+ show inline buttons; on small screens use overflow menu */}
            {!isSm ? (
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={() => onEdit(shift)}
                  sx={{ textTransform: "none", whiteSpace: "nowrap" }}
                  aria-label={`Edit ${name}`}
                >
                  Edit
                </Button>

                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  startIcon={<Delete />}
                  onClick={() => setConfirmOpen(true)}
                  sx={{ textTransform: "none", whiteSpace: "nowrap" }}
                  aria-label={`Remove ${name}`}
                >
                  Remove
                </Button>
              </Stack>
            ) : (
              <>
                <Tooltip title="Actions">
                  <IconButton size="small" onClick={handleMenuOpen} aria-label={`Open actions for ${name}`}>
                    <MoreVert />
                  </IconButton>
                </Tooltip>

                <Menu
                  anchorEl={menuAnchor}
                  open={Boolean(menuAnchor)}
                  onClose={handleMenuClose}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  <MenuItem
                    onClick={() => {
                      handleMenuClose();
                      onEdit(shift);
                    }}
                  >
                    <Edit fontSize="small" sx={{ mr: 1 }} /> Edit
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      handleMenuClose();
                      confirmRemove();
                    }}
                  >
                    <Delete fontSize="small" sx={{ mr: 1 }} /> Remove
                  </MenuItem>
                </Menu>
              </>
            )}
          </Box>
        </Box>
      </Card>

      {/* Confirmation dialog for remove */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} aria-labelledby="confirm-remove-title">
        <DialogTitle id="confirm-remove-title">Remove Shift</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Are you sure you want to remove <strong>{name}</strong>?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={doRemove}>Remove</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
