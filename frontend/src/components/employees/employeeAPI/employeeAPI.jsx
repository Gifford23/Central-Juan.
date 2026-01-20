// employeesAPI.js

import BASE_URL from "../../../../backend/server/config"; // Adjust path based on where you place this

export const addEmployee = async (employeeData) => {
  try {
    const response = await fetch(`${BASE_URL}/employeesSide/add_employee.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(employeeData),
    });

    const rawText = await response.text(); // Log raw response in case it's not JSON
    console.log("Raw server response:", rawText);

    const data = JSON.parse(rawText);

    if (data.status === "success") {
      return { success: true, message: data.message || "Employee added successfully!" };
    } else {
      return { success: false, message: data.message || "Failed to add employee." };
    }
  } catch (error) {
    console.error("Error adding employee:", error);
    return { success: false, message: "Something went wrong. Please try again later." };
  }
};

export const updateEmployee = async (employeeData) => {
  try {
    const response = await fetch(`${BASE_URL}/employeesSide/update_employee.php`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(employeeData),
    });

    const rawText = await response.text();
    console.log("Raw server response (UPDATE):", rawText);

    const data = JSON.parse(rawText);

    if (data.status === "success") {
      return { success: true, message: data.message || "Employee updated successfully!" };
    } else {
      return { success: false, message: data.message || "Failed to update employee." };
    }
  } catch (error) {
    console.error("Error updating employee:", error);
    return { success: false, message: "Something went wrong during update." };
  }
};
