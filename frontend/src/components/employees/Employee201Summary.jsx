import { Component } from "lucide-react";
import React from "react"; 
import {useState, useEffect} from 'react';
import BASE_URL from '../../../backend/server/config';
import testimg from '../../../src/assets/cjrb.png'


const Employee201Summary = () => {    
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEmployees = async () => {
            try{
                const response = await fetch(`${BASE_URL}/employeesSide/employees.php`);
                const data = await response.json();
                setEmployees(data);
                setLoading(false);
            }

            catch (error){
                console.error('fetch error:', error);
                setLoading(false);
            }
        };
        fetchEmployees();
    },[]); 


    return(
        <div className="employee201-container-dashboard201">
        {loading ? ( 
            <p>loading..</p>
        ) : ( employees.map((emp, i) => (
            
            <div className="shadow employee201-box-dashboard201">
                {emp.image ? (
                    <div className='employee201-profile201 max-w-[100px] max-h-[100px]'>
                        <img src={emp.image} alt="profile" />
                    </div>
                ) : (
                    <div className="employee-201-noimg">
                        NA
                    </div>
                )}

                <div className='information201'>
                    <p>{emp.first_name} {emp.middle_name} {emp.last_name}</p>
                    <p>{emp.department_name}</p>
                    <p>{emp.position_name}</p>
                </div>
            </div>
            
        ))                
        )}
            
        </div>
    );
};

export default Employee201Summary;