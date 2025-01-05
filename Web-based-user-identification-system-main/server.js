const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
const multer = require('multer');

const upload = multer();
const app = express();

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/mydatabase', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Define a schema for the user data
const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    verificationCode: String,
    approved: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);

// Middleware to parse request body and manage sessions
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(upload.array());
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));

// Serve static HTML files
app.use(express.static(__dirname));

// Route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route to handle login form submission
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Check if the user exists in the database
    User.findOne({ username: username, approved: true })
        .then(user => {
            if (!user) {
                // User not found or not approved
                res.status(404).send({ message: 'User not found or not approved' });
            } else {
                // User found, check password
                bcrypt.compare(password, user.password, (err, result) => {
                    if (result) {
                        // Password matched, login successful
                        req.session.username = username;
                        res.send({ redirectUrl: 'http://192.168.150.1:3001' });
                    } else {
                        // Password incorrect
                        res.status(401).send({ message: 'Incorrect password' });
                    }
                });
            }
        })
        .catch(err => {
            console.error('Error finding user:', err);
            res.status(500).send({ message: 'Error finding user' });
        });
});

// Route to handle create account form submission
app.post('/create-account', (req, res) => {
    const { username, email, password } = req.body;

    // Generate a 4-digit random number
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();

    // Check if the username or email already exists
    User.findOne({ $or: [{ username: username }, { email: email }] })
        .then(user => {
            if (user) {
                if (user.username === username) {
                    res.status(400).send({ message: 'Username already exists' });
                } else if (user.email === email) {
                    res.status(400).send({ message: 'Email already exists' });
                }
            } else {
                // Hash the password before saving
                bcrypt.hash(password, 10, (err, hash) => {
                    if (err) {
                        console.error('Error hashing password:', err);
                        res.status(500).send({ message: 'Error creating account' });
                    } else {
                        // Create a new user document
                        const newUser = new User({
                            username: username,
                            email: email,
                            password: hash,
                            verificationCode: verificationCode,
                            approved:false
                        });

                        // Save the user document to the database
                        newUser.save()
                            .then(() => {
                                res.json({ message: 'Account created successfully. Awaiting admin approval.' });
                            })
                            .catch(err => {
                                console.error('Error saving user:', err);
                                res.status(500).send({ message: 'Error saving user' });
                            });
                    }
                });
            }
        })
        .catch(err => {
            console.error('Error finding user:', err);
            res.status(500).send({ message: 'Error finding user' });
        });
});

// Route to verify email and verification code
app.post('/verify-code', (req, res) => {
    const { email, code } = req.body;

    // Verify if the email and verification code exist in the database
    User.findOne({ email: email, verificationCode: code })
        .then(user => {
            if (!user) {
                res.json({ valid: false });
            } else {
                res.json({ valid: true });
            }
        })
        .catch(err => {
            console.error('Error finding user:', err);
            res.status(500).send({ message: 'Error finding user' });
        });
});

// Route to handle password reset
app.post('/reset-password', (req, res) => {
    const { email, newPassword, verificationCode } = req.body;

    // Verify if the email and verification code exist in the database
    User.findOne({ email: email, verificationCode: verificationCode })
        .then(user => {
            if (!user) {
                res.status(404).send({ message: 'Invalid email or verification code' });
            } else {
                // Hash the new password
                bcrypt.hash(newPassword, 10, (err, hash) => {
                    if (err) {
                        console.error('Error hashing password:', err);
                        res.status(500).send({ message: 'Error resetting password' });
                    } else {
                        // Update user's password in the database
                        user.password = hash;
                        user.save()
                            .then(() => {
                                res.send({ message: 'Password reset successful.' });
                            })
                            .catch(err => {
                                console.error('Error saving new password:', err);
                                res.status(500).send({ message: 'Error saving new password' });
                            });
                    }
                });
            }
        })
        .catch(err => {
            console.error('Error finding user:', err);
            res.status(500).send({ message: 'Error finding user' });
        });
});

// Route for admin to approve users
app.post('/admin-login', (req, res) => {
    const { username, password } = req.body;

    // Check if the admin credentials are correct
    if (username === 'admin' && password === 'admin') {
        // Find all unapproved users
        User.find({ approved: false })
            .then(users => {
                if (users.length === 0) {
                    res.send({ message: 'No users awaiting approval.' });
                } else {
                    // Send list of pending users to the admin page
                    res.send({ success: true, users });
                }
            })
            .catch(err => {
                console.error('Error finding users:', err);
                res.status(500).send({ message: 'Error finding users' });
            });
    } else {
        res.status(401).send({ message: 'Incorrect admin credentials.' });
    }
});

// Route for admin to approve all pending users
app.post('/approve-users', (req, res) => {
    User.updateMany({ approved: false }, { approved: true })
        .then(() => {
            res.send({ message: 'All pending users have been approved.' });
        })
        .catch(err => {
            console.error('Error approving users:', err);
            res.status(500).send({ message: 'Error approving users' });
        });
});

// Route to handle admin logout
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send({ message: 'Error logging out' });
        }
        res.send({ message: 'Logged out successfully' });
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

