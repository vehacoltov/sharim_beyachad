const EmployeeDetails = ({ employees }) => {
    return (
        <div>
            {employees.map((employee) => (
                <li key={employee._id}>
                    {employee.fullName}
                    {employee.phone && ` — ${employee.phone}`}
                </li>
            ))}    </div>
    );
};

export default EmployeeDetails