import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import BASE_URL from "../../../../backend/server/config";

export default function useEmailAPI() {
  const [emails, setEmails] = useState([]);

  // ✅ Fetch all emails
  const fetchEmails = async () => {
    try {
      const res = await fetch(`${BASE_URL}/email/email_customization/fetch_email.php`);
      const data = await res.json();
      if (data.success) setEmails(data.data);
    } catch (err) {
      console.error("Error fetching emails:", err);
    }
  };

  // ✅ Add email
  const addEmail = async (hr_email, label = "HR Email", is_active = "active") => {
    if (!hr_email) return Swal.fire("Error", "Please enter an email", "error");

    await fetch(`${BASE_URL}/email/email_customization/add_email.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hr_email, label, is_active }),
    });
    fetchEmails();
  };

  // ✅ Update email
  const updateEmail = async (id, hr_email, label, is_active) => {
    const { value: formValues } = await Swal.fire({
      title: "Update Email",
      html: `
        <input id="swal-email" class="swal2-input" value="${hr_email}" placeholder="Email">
        <input id="swal-label" class="swal2-input" value="${label}" placeholder="Label">
        <select id="swal-active" class="swal2-input">
          <option value="active" ${is_active === "active" ? "selected" : ""}>Active</option>
          <option value="inactive" ${is_active === "inactive" ? "selected" : ""}>Inactive</option>
        </select>
      `,
      focusConfirm: false,
      preConfirm: () => {
        return {
          hr_email: document.getElementById("swal-email").value,
          label: document.getElementById("swal-label").value,
          is_active: document.getElementById("swal-active").value,
        };
      },
    });

    if (formValues) {
      await fetch(`${BASE_URL}/email/email_customization/update_email.php`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...formValues }),
      });
      fetchEmails();
    }
  };

  // ✅ Delete email
  const deleteEmail = async (id) => {
    const confirm = await Swal.fire({
      title: "Are you sure?",
      text: "This email will be deleted",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    });

    if (confirm.isConfirmed) {
      await fetch(`${BASE_URL}/email/email_customization/delete_email.php`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchEmails();
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  return { emails, fetchEmails, addEmail, updateEmail, deleteEmail };
}
