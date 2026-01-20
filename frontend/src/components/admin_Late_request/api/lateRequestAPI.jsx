import BASE_URL from "../../../../backend/server/config";

// Fetch late attendance requests for a specific employee
export async function fetchLateRequests(employeeId) {
    const response = await fetch(`${BASE_URL}/late_request_clockInOut/get_late_attendance_requests.php?employee_id=${employeeId}`);
    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch late requests');
    }

    return data.data;
}

// Update the status of a request
export async function updateLateRequestStatus(requestId, newStatus) {
    const response = await fetch(`${BASE_URL}/late_request_clockInOut/update_late_attendance_request.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            id: requestId,
            status: newStatus,
            reviewed_by: 'Admin'
        })
    });

    return await response.json();
}

// Approve late request logic
export async function approveLateRequest(data) {
    const response = await fetch(`${BASE_URL}/late_request_clockInOut/approve_late_request.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error(`Server error! Status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
        throw new Error(result.message || "Unknown error during approval.");
    }

    return result;
}

// Delete selected requests
export async function deleteSelectedRequestsAPI(requestIds) {
    if (!Array.isArray(requestIds) || requestIds.length === 0) {
        throw new Error("Missing request_id.");
    }

    const response = await fetch(`${BASE_URL}/late_request_clockInOut/delete_late_attendance_request.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_ids: requestIds })
    });

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.message || "Failed to delete requests");
    }

    return data;
}
