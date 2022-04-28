// setup express
const express = require('express');
const app = express();

// Utils class
const { Utils } = require('./models/Utils');
const Utilities = new Utils();

// database setup
const db = require('./database/connection').connection;

//routers
const classRoutes = require("./routes/classes.js");

app.use(classRoutes.router);

// setup static dir
app.use(express.static(`${__dirname}`));

// allows to recognise incoming object as json object
app.use(express.json());

// allow to pass form data
app.use(express.urlencoded({ extended: true }));

const fetch = require('node-fetch');

// create server and set up the sockets on the server
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "http://localhost:3000"
  }
});

app.get('/', (req, res) => {
    res.sendFile(`${__dirname}/index.html`);
});

io.on('connection', (socket) => {
  
  function handleGenerateCode(classTeacherId) {
    let code;
    // prevent duplicate codes
    do {
        code = Utilities.generateCode(10);
    } while (io.sockets.adapter.rooms.get(`${code}-${classTeacherId}`))
    socket.join(`${code}-${classTeacherId}`);
    socket.emit('codeGenerated', {code, classTeacherId});
  }

  function handleDeleteCode(data) {
    io.sockets.adapter.rooms.get(`${data.code}-${data.classTeacherId}`).forEach(function(client) {
      io.sockets.sockets.get(client).leave(`${data.code}-${data.classTeacherId}`);
    });
  }

  async function handleAttendLecture(data) {
    //select from database all unique class_teacher_ids for today - limit time somehow - start within 30 minutes ago
    let url = `http://localhost:8080/api/classes/today/${data.studentId}`;
    response = await fetch(url);
    result = await response.json();
    //look whether room with code and id exists - if yes then join else send error
    if (!result.message) {
      const classIds = result.classes;
      const classId = classIds.find(id => io.sockets.adapter.rooms.get(`${data.code}-${id.class_teacher_id}`));
      if (classId) {
        //student part of the room - join room and update attendance
        socket.join(`${data.code}-${classId}`);
        let url = `http://localhost:8080/api/attendance/${classId.attendance_id}`;
        response = await fetch(url, {
          method: 'patch'
        });
        result = await response.json();
        if (result.message === 'Attendance registered'){
          socket.emit('joinSuccessful');
        } else {
          socket.emit('joinFailed');
        }
      } else {
        socket.emit('joinFailed');
      }
    } else {
      socket.emit('joinFailed');
    }
  }

  socket.on('generateCode', handleGenerateCode);
  socket.on('deleteCode', handleDeleteCode);
  socket.on('attendLecture', handleAttendLecture);
});

const PORT = process.env.PORT || 8080;
/* eslint-disable no-debugger, no-console */
server.listen(PORT, (error) => {
    if (error) {
      console.log(error);
    }
    console.log('Server is running on port', Number(PORT));
});