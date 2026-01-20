// src/components/lateDeduction/RuleForm.jsx
import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Alert,
} from "@mui/material";

/**
 * Props:
 * - open, onClose, onSave (async or sync), initialData, tierId
 * - existingRules (optional) : array of { id, min_minutes, max_minutes, deduction_type, deduction_value, description }
 */
const RuleForm = ({ open, onClose, onSave, initialData, tierId, existingRules = [] }) => {
  const [minMinutes, setMinMinutes] = useState("");
  const [maxMinutes, setMaxMinutes] = useState("");
  const [deductionType, setDeductionType] = useState("credit");
  const [deductionValue, setDeductionValue] = useState("");
  const [description, setDescription] = useState("");
  const [errorMsg, setErrorMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  // field error states
  const [fieldErrors, setFieldErrors] = useState({
    minMinutes: false,
    maxMinutes: false,
    deductionType: false,
    deductionValue: false,
  });

  useEffect(() => {
    if (initialData) {
      setMinMinutes(initialData.min_minutes ?? "");
      setMaxMinutes(initialData.max_minutes ?? "");
      setDeductionType(initialData.deduction_type ?? "credit");
      setDeductionValue(initialData.deduction_value ?? "");
      setDescription(initialData.description ?? "");
    } else {
      setMinMinutes("");
      setMaxMinutes("");
      setDeductionType("credit");
      setDeductionValue("");
      setDescription("");
    }
    setErrorMsg(null);
    setFieldErrors({
      minMinutes: false,
      maxMinutes: false,
      deductionType: false,
      deductionValue: false,
    });
  }, [initialData, open]);

  // helpers
  const toNumOrNull = (v) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const isOverlap = (aMin, aMax, bMin, bMax) => {
    const Amin = Number(aMin);
    const Bmin = Number(bMin);
    const Amax = aMax == null ? Infinity : Number(aMax);
    const Bmax = bMax == null ? Infinity : Number(bMax);
    if (!Number.isFinite(Amin) || !Number.isFinite(Bmin)) return false;
    return !(Amax < Bmin || Bmax < Amin);
  };

  const findConflict = (candidate, rules) => {
    for (const r of rules || []) {
      if (candidate.id && r.id && Number(candidate.id) === Number(r.id)) continue;
      if (isOverlap(candidate.min_minutes, candidate.max_minutes, r.min_minutes, r.max_minutes)) {
        return r;
      }
    }
    return null;
  };

  /**
   * Validate fields and return both message and newFieldErrors object.
   * We return the field error map so caller can focus the first invalid input
   * and avoid showing a modal for simple "re-input" situations.
   */
  const validateFields = (payload) => {
    const newFieldErrors = {
      minMinutes: false,
      maxMinutes: false,
      deductionType: false,
      deductionValue: false,
    };
    let msg = null;

    if (payload.min_minutes == null || !Number.isFinite(payload.min_minutes)) {
      msg = "Min minutes is required.";
      newFieldErrors.minMinutes = true;
    } else if (payload.max_minutes != null && payload.max_minutes < payload.min_minutes) {
      msg = "Max minutes must be greater than or equal to Min minutes.";
      newFieldErrors.maxMinutes = true;
    } else if (!payload.deduction_type) {
      msg = "Deduction type is required.";
      newFieldErrors.deductionType = true;
    } else if (payload.deduction_type === "credit") {
      if (!(payload.deduction_value >= 0 && payload.deduction_value <= 1)) {
        msg = "For 'credit' deduction value must be between 0 and 1 (fraction of shift).";
        newFieldErrors.deductionValue = true;
      }
    } else if (payload.deduction_type === "percent") {
      if (!(payload.deduction_value >= 0 && payload.deduction_value <= 100)) {
        msg = "For 'percent' deduction value must be between 0 and 100.";
        newFieldErrors.deductionValue = true;
      }
    } else {
      if (!(payload.deduction_value >= 0)) {
        msg = "For 'fixed' deduction value must be >= 0.";
        newFieldErrors.deductionValue = true;
      }
    }

    return { msg, newFieldErrors };
  };

  const handleSubmit = async () => {
    setErrorMsg(null);

    const payload = {
      id: initialData?.id ?? null,
      tier_id: tierId ?? null,
      min_minutes: toNumOrNull(minMinutes),
      max_minutes: toNumOrNull(maxMinutes),
      deduction_type: deductionType,
      deduction_value: Number(deductionValue),
      description,
    };
    console.error("handleSubmit rule form", payload);

    // validate and get field errors map
    const { msg: fieldErrMsg, newFieldErrors } = validateFields(payload);
    setFieldErrors(newFieldErrors);

    if (fieldErrMsg) {
      // If the problem is a missing/required field (i.e. any fieldErrors true),
      // do NOT show a modal — instead focus the first invalid field so the user re-enters it.
      const hasFieldError = Object.values(newFieldErrors).some(Boolean);
      setErrorMsg(fieldErrMsg);

      if (hasFieldError) {
        // focus first invalid field (min -> max -> deductionType -> deductionValue)
        if (newFieldErrors.minMinutes) {
          const el = document.querySelector('input[type="number"][aria-label="Min Minutes"], input[name="minMinutes"], input[aria-label="minMinutes"]');
          // fallback to first number input if specific selector not present
          const fallback = document.querySelector('input[type="number"]');
          try {
            (el || fallback)?.focus();
          } catch (e) {
            // ignore focus failures
          }
        } else if (newFieldErrors.maxMinutes) {
          const el = document.querySelector('input[aria-label="Max Minutes"], input[name="maxMinutes"]');
          try {
            el?.focus();
          } catch (e) {}
        } else if (newFieldErrors.deductionType) {
          // focus the select by querying the select element in the dialog
          const sel = document.querySelector('select[aria-label="Deduction Type"], select[name="deductionType"]');
          try {
            sel?.focus();
          } catch (e) {}
        } else if (newFieldErrors.deductionValue) {
          const el = document.querySelector('input[aria-label*="Deduction Value"], input[name="deductionValue"]');
          try {
            el?.focus();
          } catch (e) {}
        }
        // return early — user must re-input required fields
        return;
      }

      // If no field-level errors (shouldn't happen often), fall back to modal for completeness
      Swal.fire("Validation", fieldErrMsg, "error");
      return;
    }

    // client-side overlap detection if existingRules provided
    if (Array.isArray(existingRules) && existingRules.length > 0) {
      const conflict = findConflict(payload, existingRules);
      if (conflict) {
        const msg = `This rule overlaps with existing rule id=${conflict.id} (${conflict.min_minutes} - ${
          conflict.max_minutes ?? "∞"
        })`;
        setErrorMsg(msg);
        Swal.fire("Overlap", msg, "error");
        return;
      }
    }

    try {
      setSaving(true);
      const maybePromise = onSave(payload);
      if (maybePromise && typeof maybePromise.then === "function") {
        const res = await maybePromise;
        if (res && typeof res === "object" && "success" in res) {
          if (!res.success) {
            const msg = res.message || "Failed to save rule";
            setErrorMsg(msg);
            Swal.fire("Error", msg, "error");
            setSaving(false);
            return;
          }
        }
      }
      Swal.fire("Saved", "Rule has been saved.", "success");
      onClose();
    } catch (err) {
      const em = err?.message || "Failed to save rule";
      setErrorMsg(em);
      Swal.fire("Error", em, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initialData ? "Edit Rule" : "Add Rule"}</DialogTitle>
      <DialogContent className="flex flex-col gap-4 mt-2">
        {errorMsg && <Alert severity="error">{errorMsg}</Alert>}

        <TextField
          label="Min Minutes"
          type="number"
          value={minMinutes}
          onChange={(e) => {
            setMinMinutes(e.target.value);
            setFieldErrors((p) => ({ ...p, minMinutes: false }));
            setErrorMsg(null);
          }}
          fullWidth
          required
          error={fieldErrors.minMinutes}
          helperText={fieldErrors.minMinutes ? "Required or invalid value" : ""}
          // provide aria-label so focusing selector above can find it reliably
          inputProps={{ "aria-label": "Min Minutes", name: "minMinutes" }}
        />

        <TextField
          label="Max Minutes (leave empty for ∞)"
          type="number"
          value={maxMinutes}
          onChange={(e) => {
            setMaxMinutes(e.target.value);
            setFieldErrors((p) => ({ ...p, maxMinutes: false }));
            setErrorMsg(null);
          }}
          fullWidth
          error={fieldErrors.maxMinutes}
          helperText={fieldErrors.maxMinutes ? "Must be ≥ Min Minutes" : ""}
          inputProps={{ "aria-label": "Max Minutes", name: "maxMinutes" }}
        />

        <TextField
          select
          label="Deduction Type"
          value={deductionType}
          onChange={(e) => {
            setDeductionType(e.target.value);
            setFieldErrors((p) => ({ ...p, deductionType: false }));
            setErrorMsg(null);
          }}
          fullWidth
          error={fieldErrors.deductionType}
          helperText={fieldErrors.deductionType ? "Please select a type" : ""}
          SelectProps={{ "aria-label": "Deduction Type", name: "deductionType" }}
        >
          <MenuItem value="credit">Credit</MenuItem>
          <MenuItem value="fixed">Fixed</MenuItem>
          <MenuItem value="percent">Percent</MenuItem>
        </TextField>

        <TextField
          label={
            deductionType === "credit"
              ? "Deduction Value (0.00 - 1.00)"
              : deductionType === "percent"
              ? "Deduction Value (0 - 100)"
              : "Deduction Value (fixed amount)"
          }
          type="number"
          value={deductionValue}
          onChange={(e) => {
            setDeductionValue(e.target.value);
            setFieldErrors((p) => ({ ...p, deductionValue: false }));
            setErrorMsg(null);
          }}
          fullWidth
          error={fieldErrors.deductionValue}
          helperText={fieldErrors.deductionValue ? "Invalid value" : ""}
          inputProps={{ "aria-label": "Deduction Value", name: "deductionValue" }}
        />

        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {initialData ? (saving ? "Saving..." : "Update") : saving ? "Saving..." : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RuleForm;
