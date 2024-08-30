const express = require('express');
const http = require('http');
const path = require('path');
const socketio = require('socket.io');
const bodyParser = require('body-parser');
const session = require('express-session');
const { MongoClient } = require('mongodb');
require('dotenv').config(); // To load environment variables from .env file

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const mongoURI = process.env.MONGO_URI;
const client = new MongoClient(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

let usersCollection, messagesCollection;

client.connect(err => {
    if (err) throw err;
    console.log('Connected to MongoDB');
    const db = client.db('chat-app');
    usersCollection = db.collection('users');
    messagesCollection = db.collection('messages');
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'mySecretKey',
    resave: false,
    saveUninitialized: true
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    if (req.session.username) {
        res.sendFile(path.join(__dirname, 'views', 'index.html'));
    } else {
        res.redirect('/login');
    }
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    usersCollection.findOne({ username, password }, (err, user) => {
        if (user) {
            req.session.username = username;
            res.redirect('/');
        } else {
            res.redirect('/login');
        }
    });
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    usersCollection.findOne({ username }, (err, user) => {
        if (user) {
            res.redirect('/register');
        } else {
            usersCollection.insertOne({ username, password }, err => {
                if (err) throw err;
                req.session.username = username;
                res.redirect('/');
            });
        }
    });
});

// Socket.io for real-time communication
io.on('connection', socket => {
    const username = socket.handshake.query.username;
    socket.username = username;

    // Notify all clients about the user list
    usersCollection.find().toArray((err, users) => {
        io.emit('userList', users);
    });

    socket.emit('message', { sender: 'System', message: 'Welcome to ChatApp!' });

    socket.on('chatMessage', ({ message, recipient }) => {
        if (recipient) {
            // Private message
            socket.to(recipient).emit('privateMessage', { sender: username, message });
            messagesCollection.insertOne({ sender: username, recipient, message });
        } else {
            // Group message
            io.emit('message', { sender: username, message });
            messagesCollection.insertOne({ sender: username, message });
        }
    });

    socket.on('disconnect', () => {
        // Remove user from the list and notify all clients
        usersCollection.deleteOne({ username }, err => {
            if (err) throw err;
            usersCollection.find().toArray((err, users) => {
                io.emit('userList', users);
            });
        });
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
