import React, { useState, useEffect } from 'react';
import UserTable from './components/UserTable';
import 'bootstrap/dist/css/bootstrap.min.css';
import Papa from 'papaparse';

const App = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    // Fetch users from your API
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    // Replace with your API endpoint
    const response = await fetch('https://obyrlo.cyclic.app/api/users');
    const data = await response.json();
    setUsers(data);
  };

  const updateStatus = async (userId, newStatus) => {
    try {
      const response = await fetch(`/api/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
  
      if (!response.ok) {
        throw new Error('Error updating status');
      }
  
      // Optionally, you could re-fetch the user data here to update the UI
      fetchUsers();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };
  

  const downloadCSV = () => {
    const csv = Papa.unparse(users);
    const csvData = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const csvURL = window.URL.createObjectURL(csvData);
    const tempLink = document.createElement('a');
    tempLink.href = csvURL;
    tempLink.setAttribute('download', 'userdata.csv');
    tempLink.click();
  };

  const filteredUsers = users
  .filter(user => user.name.toLowerCase() !== 'user')
    .filter(user => user.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(user => selectedStatus ? user.status === selectedStatus : true);

  return (
    <div className="container mt-4">
      <h1 style={{textAlign : 'center'}}>User Data</h1>
      <div className="mb-3">
        <input 
          type="text" 
          placeholder="Search by name..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
          className="form-control mb-2"
        />
        <select 
          value={selectedStatus} 
          onChange={e => setSelectedStatus(e.target.value)} 
          className="form-control mb-2"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Approved</option>
        </select>
        <button onClick={downloadCSV} className="btn btn-primary">Download CSV</button>
      </div>
      <UserTable users={filteredUsers} onStatusChange={updateStatus} />
    </div>
  );
};

export default App;
