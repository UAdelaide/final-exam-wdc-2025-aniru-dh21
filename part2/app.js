const express = require('express');
const session = require('express-session');
const db = require('./models/db.js');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '/public')));

// Session middleware
app.use(session({
    secret: 'd9ab238ca788259db2d6047343c2e177dfc032cdc5daaab1f3b2ab562b2dddce1cc5202fec2c01fea51b9751968623426521837aca5dbdad4dd44cbfc9876dbe', // Use environment variable in production
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);

// Export the app instead of listening here
module.exports = app;

const PORT = 8080;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

app.get('/api/dogs', async (req, res) => {
    try {
        const [dogs] = await db.execute(`
      SELECT d.name as dog_name, d.size, u.username as owner_username
      FROM Dogs d
      JOIN USERS u ON d.owner_id = u.user_id
      ORDER BY d.name
    `);
        res.json(dogs);
    } catch (err) {
        console.error('Error fetching dogs:', err);
        res.status(500).json({ error: 'Failed to fetch dogs' });
    }
});
