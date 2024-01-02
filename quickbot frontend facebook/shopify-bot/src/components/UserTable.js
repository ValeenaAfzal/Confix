
import React from 'react';
import '../UserTable.css'; // Custom CSS file

const UserTable = ({ users, onStatusChange }) => {
  return (
    <table className="table table-bordered table-hover">
      <thead className="thead-dark">
        <tr>
          <th>PSID</th>
          <th>Name</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Address</th>
          <th>Image</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {users.map(user => (
          <tr key={user._id}>
            <td>{user.psid}</td>
            <td>{user.name || ''}</td>
            <td>{user.email || ''}</td>
            <td>{user.phone || ''}</td>
            <td>{user.address || ''}</td>
            <td>
              {user.attachmentUrl && (
                <img src={user.attachmentUrl} alt="User Attachment" style={{ width: '50px', height: '50px' }} />
              )}
            </td>
            <td>
              <select 
                className="form-control"
                value={user.status || 'pending'} 
                onChange={(e) => onStatusChange(user._id, e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="active">Approved</option>
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default UserTable;
