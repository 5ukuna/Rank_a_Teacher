const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const socketIo = require('socket.io');
const http = require('http');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = 3001;

app.use(bodyParser.json());
app.use(cors());

// MongoDB Connection
mongoose.connect('mongodb+srv://sukuna:8D21Ra3ame5OokAq@cluster0.qsrkr4u.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Teacher Schema DB
const teacherSchema = new mongoose.Schema({
  name: String,
  photo: String,
  bio: String,
  upvotes: Number,
  downvotes: Number,
  confidence: Number // Added confidence field to the schema
});
  
const Teacher = mongoose.model('Teacher', teacherSchema);

// Confidence Algorithm
function calculateConfidence(ups, downs) {
  let n = ups + downs;

  if (n === 0) {
    return 0;
  }

  let z = 1.281551565545;
  let p = ups / n;

  let left = p + (1 / (2 * n)) * z * z;
  let right = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  let under = 1 + (1 / n) * z * z;

  return (left - right) / under;
}

// Socket.io connection setup
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Route to add a new teacher
app.post('/api/teachers', async (req, res) => {
  try {
    const { name, photo, bio } = req.body;
    const newTeacher = new Teacher({
      name,
      photo,
      bio,
      upvotes: 0,
      downvotes: 0,
      confidence: 0 // Initialize confidence with 0 for a new teacher
    });
    const savedTeacher = await newTeacher.save();
    res.json(savedTeacher);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
  
// Route to get all teachers sorted by confidence
app.get('/api/teachers', async (req, res) => {
  try {
    const teachers = await Teacher.find();

    // Calculate confidence for each teacher
    const teachersWithConfidence = teachers.map(teacher => {
      const confidence = calculateConfidence(teacher.upvotes, teacher.downvotes);
      return { ...teacher._doc, confidence }; // Add confidence to the teacher object
    });

    // Sort teachers by confidence in descending order
    const sortedTeachers = teachersWithConfidence.sort((a, b) => b.confidence - a.confidence);
  
    res.json(sortedTeachers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Route to upvote/downvote a teacher
app.patch('/api/teachers/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { voteType } = req.body; // 'upvote' or 'downvote'
    const teacher = await Teacher.findById(id);
  
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
  
    if (voteType === 'upvote') {
      teacher.upvotes += 1;
    } else if (voteType === 'downvote') {
      teacher.downvotes += 1;
    }
  
    teacher.confidence = calculateConfidence(teacher.upvotes, teacher.downvotes);
  
    await teacher.save();

    // Emitting updated teacher data to all connected clients
    io.emit('updateTeacher', teacher);

    res.json(teacher);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});  

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
