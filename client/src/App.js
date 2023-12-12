import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

function App() {
  const [teachers, setTeachers] = useState([]);
  // Connecting to the server's Socket.io instance
  const socket = io('http://localhost:3001');

  // Fetch teachers when component mounts
  useEffect(() => {
    axios.get('http://localhost:3001/api/teachers')
      .then(response => {
        setTeachers(response.data);
      })
      .catch(error => {
        console.error('Error fetching teachers:', error);
      });

      // Listen for 'updateTeacher' event from the server and update the state
    socket.on('updateTeacher', updatedTeacher => {
      setTeachers(prevTeachers => prevTeachers.map(teacher => (teacher._id === updatedTeacher._id ? updatedTeacher : teacher)));
    });

    return () => {
      socket.disconnect(); // Clean up the socket connection when component unmounts
    };
  }, [socket]);

  //Adding New Teacher
  const [newTeacher, setNewTeacher] = useState({
    name: '',
    photo: '',
    bio: ''
  });

  const handleInputChange = (e) => {
    setNewTeacher({ ...newTeacher, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post('http://localhost:3001/api/teachers', newTeacher)
      .then(response => {
        // Update teachers list after adding a new teacher
        setTeachers([...teachers, response.data]);
        setNewTeacher({ name: '', photo: '', bio: '' }); // Clear form fields
      })
      .catch(error => {
        console.error('Error adding teacher:', error);
      });
  };

  // Update the teachers list with the updated teacher after voting
  const handleVote = (id, voteType) => {
    axios.patch(`http://localhost:3001/api/teachers/${id}/vote`, { voteType })
      .then(response => {
        // This will emit the 'updateTeacher' event to the server
      })
      .catch(error => {
        console.error('Error voting:', error);
      });
  };

  return (
    <div className="App">
      <h1>Rank A Teacher</h1> <br/>

      <ul>
        {teachers.map(teacher => (
          <li key={teacher._id}>
            <h3>{teacher.name}</h3>
            <img src={teacher.photo} alt={teacher.name} style={{ maxWidth: '200px' }} />
            <p>{teacher.bio}</p>
            <button onClick={() => handleVote(teacher._id, 'upvote')}>
              Upvote ({teacher.upvotes})
            </button>
            <button onClick={() => handleVote(teacher._id, 'downvote')}>
              Downvote ({teacher.downvotes})
            </button>
            <br/><br/>
          </li>
        ))}
      </ul>

          <br/>
          <br/>

      <form onSubmit={handleSubmit}>
        <input type="text" name="name" value={newTeacher.name} onChange={handleInputChange} placeholder="Name" />
        <input type="text" name="photo" value={newTeacher.photo} onChange={handleInputChange} placeholder="Photo URL" />
        <textarea name="bio" value={newTeacher.bio} onChange={handleInputChange} placeholder="Bio"></textarea>
        <button type="submit">Add Teacher</button>
      </form>

    </div>
  );
}

export default App;
