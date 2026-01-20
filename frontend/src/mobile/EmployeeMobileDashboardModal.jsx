import React, { useState } from 'react';
import TextField from '@mui/material/TextField';
import Swal from "sweetalert2";

function EmployeeMobileDashboardModal({ isOpen, onClose, formData, onSave }) {
  const [localFormData, setLocalFormData] = useState(formData);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLocalFormData({
      ...localFormData,
      [name]: value,
    });
  };

  const handleSave = () => {
    onSave(localFormData);  // Pass the updated data back to the parent
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 top-0 flex items-center justify-center modal bg-black/30 backdrop-blur-sm">
      <div className="p-6 bg-white rounded-md modal-content w-96">
        <h2 className="mb-4 text-xl font-semibold">Edit Profile</h2>
          <p className="mb-4 text-sm font-medium text-red-600">Some fields are disabled. Please contact HR or Admin if you want to update your information.</p>
            <form onSubmit={(e) => e.preventDefault()}>
              <label className="flex flex-col block py-1 mb-2">
                <TextField
                  id="outlined-basic" label="First Name" variant="outlined"
                  type="text"
                  name="first_name"
                  value={localFormData.first_name}
                  onChange={handleInputChange}
                  className="input-field-employeeMobile border-[1px] px-2 py-2 focus:3px solid color-black"
                  disabled
                  //  InputProps={{
                  //     style: {
                  //       cursor: "not-allowed",    // 🚫 disable cursor
                  //       // caretColor: "transparent" // ❌ hide blinking cursor
                  //      }
                  // }}  
                  sx={{
                      "& .MuiInputBase-input.Mui-disabled": {
                        // WebkitTextFillColor: "#000", // keep text black instead of gray
                        cursor: "not-allowed",       // 🚫 cursor stays red/disabled
                    },
                    //  "& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline": {
                    //     borderColor: "black",          // 🔴 red outline when disabled
                    //    }
                    }}
                />
              </label>
              <label className="flex flex-col block py-1 mb-2">
                <TextField
                  id="outlined-basic" label="Middle Name" variant="outlined"
                  type="text"
                  name="middle_name"
                  value={localFormData.middle_name}
                  onChange={handleInputChange}
                  className="input-field-employeeMobile border-[1px] px-2 py-2 focus:3px solid color black"
                  disabled
                    //  InputProps={{
                  //     style: {
                  //       cursor: "not-allowed",    // 🚫 disable cursor
                  //       // caretColor: "transparent" // ❌ hide blinking cursor
                  //      }
                  // }}  
                  sx={{
                      "& .MuiInputBase-input.Mui-disabled": {
                        // WebkitTextFillColor: "#000", // keep text black instead of gray
                        cursor: "not-allowed",       // 🚫 cursor stays red/disabled
                    },
                    //  "& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline": {
                    //     borderColor: "black",          // 🔴 red outline when disabled
                    //    }
                    }}
                />
              </label>
              <label className="flex flex-col block py-1 mb-2">
                <TextField
                  id="outlined-basic" label="Last Name" variant="outlined"
                  type="text"
                  name="last_name"
                  value={localFormData.last_name}
                  onChange={handleInputChange}
                  className="input-field-employeeMobile border-[1px] px-2 py-2 focus:3px solid color black"
                  disabled
                    //  InputProps={{
                  //     style: {
                  //       cursor: "not-allowed",    // 🚫 disable cursor
                  //       // caretColor: "transparent" // ❌ hide blinking cursor
                  //      }
                  // }}  
                  sx={{
                      "& .MuiInputBase-input.Mui-disabled": {
                        // WebkitTextFillColor: "#000", // keep text black instead of gray
                        cursor: "not-allowed",       // 🚫 cursor stays red/disabled
                    },
                    //  "& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline": {
                    //     borderColor: "black",          // 🔴 red outline when disabled
                    //    }
                    }}
                />
              </label>
              <label className="flex flex-col block py-1 mb-2">
                <TextField
                  id="outlined-basic" label="Email" variant="outlined"
                  type="email"
                  name="email"
                  value={localFormData.email}
                  onChange={handleInputChange}
                  className="input-field-employeeMobile border-[1px] px-2 py-2 focus:3px solid color black"
                  // disabled
                  //  InputProps={{
                  //     style: {
                  //       cursor: "not-allowed",    // 🚫 disable cursor
                  //       // caretColor: "transparent" // ❌ hide blinking cursor
                  //      }
                  // }}  
                  sx={{
                      "& .MuiInputBase-input.Mui-disabled": {
                        // WebkitTextFillColor: "#000", // keep text black instead of gray
                        cursor: "not-allowed",       // 🚫 cursor stays red/disabled
                    },
                    //  "& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline": {
                    //     borderColor: "black",          // 🔴 red outline when disabled
                    //    }
                    }}
                />
              </label>
              <label className="flex flex-col block py-1 mb-2">
                <TextField
                  id="outlined-basic" label="Contact Number " variant="outlined"
                  type="text"
                  name="contact_number"
                  value={localFormData.contact_number}
                  onChange={handleInputChange}
                  className="input-field-employeeMobile border-[1px] px-2 py-2 focus:3px solid color black"
                  //  InputProps={{
                  //     style: {
                  //       cursor: "not-allowed",    // 🚫 disable cursor
                  //       // caretColor: "transparent" // ❌ hide blinking cursor
                  //      }
                  // }}  
                  sx={{
                      "& .MuiInputBase-input.Mui-disabled": {
                        // WebkitTextFillColor: "#000", // keep text black instead of gray
                        cursor: "not-allowed",       // 🚫 cursor stays red/disabled
                    },
                    //  "& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline": {
                    //     borderColor: "black",          // 🔴 red outline when disabled
                    //    }
                    }}
                />
              </label>
              <label className="flex flex-col block py-1 mb-2">
                <TextField
                  id="outlined-number"
                  label="Date of birth"
                  slotProps={{
                    inputLabel: {
                      shrink: true,
                    },
                  }}
                  type="date"
                  name="date_of_birth"
                  value={localFormData.date_of_birth}
                  onChange={handleInputChange}
                  className="input-field-employeeMobile border-[1px] px-2 py-2 focus:3px solid color black"
                  disabled
                  //  InputProps={{
                  //     style: {
                  //       cursor: "not-allowed",    // 🚫 disable cursor
                  //       // caretColor: "transparent" // ❌ hide blinking cursor
                  //      }
                  // }}  
                  sx={{
                      "& .MuiInputBase-input.Mui-disabled": {
                        // WebkitTextFillColor: "#000", // keep text black instead of gray
                        cursor: "not-allowed",       // 🚫 cursor stays red/disabled
                    },
                    //  "& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline": {
                    //     borderColor: "black",          // 🔴 red outline when disabled
                    //    }
                    }}
                />
              </label>
              <div className="flex justify-end w-full gap-4 mt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-white bg-red-500 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="p-2 text-white bg-green-500 rounded-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
         </div>
      </div>
    );
  }

export default EmployeeMobileDashboardModal;
