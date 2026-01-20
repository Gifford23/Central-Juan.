# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh




{user?.role === "admin" && (
            <div>
              <button
                className="delete_select"
                onClick={handleDeleteSelectedEmployees}
                disabled={selectedEmployees.length === 0}
              >
                Delete Selected
              </button>
              <button
                className="add_employee"
                onClick={() => {
                  setEditingEmployee(null);
                  setIsModalOpen(true);
                }}
              >
                Add Employee
              </button>
              <button
                className="print_BTN"
                onClick={handlePrintSelected}
                disabled={selectedEmployees.length === 0}
              >
                Print Selected
              </button>
              bsjdgas
            </div>
          )}
