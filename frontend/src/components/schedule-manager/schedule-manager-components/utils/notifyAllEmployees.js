import Swal from "sweetalert2";
import { fmtDisplayDate } from "./scheduleUtils.js";
import BASE_URL from "../../../../../backend/server/config.js";

export async function notifyAllEmployees({ startDate, endDate, onProgress, onDone }) {
  try {
    // 🧾 Confirmation first
    const confirm = await Swal.fire({
      title: "Confirm Notification",
      text: "The selected schedule will be applied to all active employees. Each active employee will receive an email notification about their new shift. Continue?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, send it!",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#d33",
    });

    if (!confirm.isConfirmed) return;

    // 🕒 Show loading modal
    Swal.fire({
      title: "Sending Notifications...",
      html: "Preparing data. Please wait.",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    onProgress("Fetching active employees...");

    // 🧩 Fetch data
    const resEmp = await fetch(`${BASE_URL}/employeesSide/employees.php`);
    const employees = await resEmp.json();
    if (!employees || !Array.isArray(employees)) throw new Error("Invalid employee response");

    const resSub = await fetch(`${BASE_URL}/schedule-manager/schedule_submissions.php`);
    const submissions = await resSub.json();

    const resWork = await fetch(`${BASE_URL}/work_time/read_work_time.php`);
    const workTimeRes = await resWork.json();
    const workTimes = workTimeRes?.data || [];
    const workTimeMap = Object.fromEntries(workTimes.map((wt) => [String(wt.id), wt.shift_name]));

    // ⏰ Setup date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // 🧮 Filter "applied" schedules within range
    const appliedSubs = submissions.filter((s) => {
      if (s.status !== "applied") return false;
      const effDate = new Date(s.effective_date);
      return effDate >= start && effDate <= end;
    });

    const appliedEmployeeIDs = appliedSubs.map((s) => s.employee_id);

    // ✅ Only ACTIVE employees
    const filteredEmployees = employees.filter(
      (e) =>
        appliedEmployeeIDs.includes(e.employee_id) &&
        e.status?.toLowerCase() === "active"
    );

    if (filteredEmployees.length === 0) {
      Swal.close();
      await Swal.fire(
        "No Active Employees",
        "No active employees found with applied schedules in this range.",
        "info"
      );
      onDone();
      return;
    }

    // 📨 Send emails (loop)
    for (let i = 0; i < filteredEmployees.length; i++) {
      const emp = filteredEmployees[i];
      const empSubs = appliedSubs.filter((s) => s.employee_id === emp.employee_id);

      const fullDates = [];
      const curr = new Date(start);
      const last = new Date(end);
      last.setHours(23, 59, 59, 999);
      while (curr <= last) {
        fullDates.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
      }

      const tableRows = fullDates
        .map((date) => {
          const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "short" });
          const formattedDate = fmtDisplayDate(date);
          const foundSub = empSubs.find(
            (s) => new Date(s.effective_date).toDateString() === date.toDateString()
          );
          const shiftName = foundSub
            ? workTimeMap[String(foundSub.work_time_id)] || "Unassigned Shift"
            : "No assigned shift";

          return `
            <tr>
              <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:left;">
                <b>${dayOfWeek},</b> ${formattedDate}
              </td>
              <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:left;">
                ${shiftName}
              </td>
            </tr>`;
        })
        .join("");

      const htmlMessage = `
        <div style="font-family:'Segoe UI',Roboto,Arial,sans-serif;color:#333;line-height:1.6;max-width:680px;margin:auto;padding:20px;background-color:#f9fafb;border-radius:8px;">
          <h2 style="color:#111827;margin:0 0 6px;">Hi ${emp.first_name},</h2>
          <p style="margin:0;">Below is your approved <strong>shift schedule</strong> for 
            <b>${fmtDisplayDate(startDate)}</b> to <b>${fmtDisplayDate(endDate)}</b>:</p>
          <table style="width:100%;background:#fff;border-radius:6px;border-collapse:collapse;">
            <tr style="background-color:#f3f4f6;">
              <th style="padding:10px 14px;text-align:left;">Date</th>
              <th style="padding:10px 14px;text-align:left;">Shift</th>
            </tr>
            ${tableRows}
          </table>
          <p style="margin-top:18px;">Please log in to your HRIS account for more details.</p>
          <p style="margin-top:6px;">Best regards,<br><strong>HR Department</strong></p>
        </div>`;

      onProgress(`Sending to ${emp.first_name} (${i + 1}/${filteredEmployees.length})...`);

      Swal.update({
        html: `Sending to <b>${emp.first_name}</b> (${i + 1}/${filteredEmployees.length})...`,
      });

      await fetch(`${BASE_URL}/email/send_mail.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetEmail: emp.email, message: htmlMessage }),
      });
    }

    Swal.close();
    await Swal.fire({
      title: "✅ Notifications Sent!",
      text: "All active employees have been notified successfully.",
      icon: "success",
      confirmButtonColor: "#2563eb",
    });

    onProgress("✅ All active employees notified successfully!");
    onDone();
  } catch (err) {
    console.error("Notify error:", err);
    Swal.close();
    Swal.fire("❌ Error", "Failed to notify employees: " + err.message, "error");
    onProgress("❌ Failed to notify employees: " + err.message);
    onDone();
  }
}
