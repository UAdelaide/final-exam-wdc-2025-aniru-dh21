var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql2/promise');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

let db;

(async () => {
  try {
    // Connect to MySQL without specifying a database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'anirudh@2003' // Set your MySQL root password
    });

    // Create the database if it doesn't exist
    await connection.query('CREATE DATABASE IF NOT EXISTS DogWalkService');
    await connection.end();

    // Now connect to the created database
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'anirudh@2003',
      database: 'DogWalkService'
    });

    // Create a table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS USERS (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('owner', 'walker') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS Dogs (
        dog_id INT AUTO_INCREMENT PRIMARY KEY,
        owner_id INT NOT NULL,
        name VARCHAR(50) NOT NULL,
        size ENUM('small', 'medium', 'large') NOT NULL,
        FOREIGN KEY (owner_id) REFERENCES Users(user_id)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS WalkRequests (
        request_id INT AUTO_INCREMENT PRIMARY KEY,
        dog_id INT NOT NULL,
        requested_time DATETIME NOT NULL,
        duration_minutes INT NOT NULL,
        location VARCHAR(255) NOT NULL,
        status ENUM('open', 'accepted', 'completed', 'cancelled') DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dog_id) REFERENCES Dogs(dog_id)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS WalkApplications (
        application_id INT AUTO_INCREMENT PRIMARY KEY,
        request_id INT NOT NULL,
        walker_id INT NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
        FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
        FOREIGN KEY (walker_id) REFERENCES Users(user_id),
        CONSTRAINT unique_application UNIQUE (request_id, walker_id)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS WalkRatings (
        rating_id INT AUTO_INCREMENT PRIMARY KEY,
        request_id INT NOT NULL,
        walker_id INT NOT NULL,
        owner_id INT NOT NULL,
        rating INT CHECK (rating BETWEEN 1 AND 5),
        comments TEXT,
        rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
        FOREIGN KEY (walker_id) REFERENCES Users(user_id),
        FOREIGN KEY (owner_id) REFERENCES Users(user_id),
        CONSTRAINT unique_rating_per_walk UNIQUE (request_id)
      )
    `);

    // Insert data if table is empty
    const [rows] = await db.execute('SELECT COUNT(*) AS count FROM Users');
    if (rows[0].count === 0) {
      await db.execute(`
        INSERT INTO Users (username, email, password_hash, role) VALUES
        ('alice123', 'alice@example.com', 'hashed123', 'owner'),
        ('bobwalker', 'bob@example.com', 'hashed456', 'walker'),
        ('carol123', 'carol@example.com', 'hashed789', 'owner'),
        ('davidwalks', 'david@example.com', 'hashed101', 'walker'),
        ('emma_owner', 'emma@example.com', 'hashed202', 'owner');
      `);

      await db.execute(`
        INSERT INTO Dogs (owner_id, name, size) VALUES
        ((SELECT user_id FROM Users WHERE username = 'alice123'), 'Max', 'medium'),
        ((SELECT user_id FROM Users WHERE username = 'carol123'), 'Bella', 'small'),
        ((SELECT user_id FROM Users WHERE username = 'alice123'), 'Rocky', 'large'),
        ((SELECT user_id FROM Users WHERE username = 'emma_owner'), 'Luna', 'small'),
        ((SELECT user_id FROM Users WHERE username = 'carol123'), 'Charlie', 'medium');
      `);

      await db.execute(`
        INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status) VALUES
        ((SELECT dog_id FROM Dogs WHERE name = 'Max' AND owner_id = (SELECT user_id FROM Users WHERE username = 'alice123')),
        '2025-06-10 08:00:00', 30, 'Parklands', 'open'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Bella' AND owner_id = (SELECT user_id FROM Users WHERE username = 'carol123')),
        '2025-06-10 09:30:00', 45, 'Beachside Ave', 'accepted'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Rocky' AND owner_id = (SELECT user_id FROM Users WHERE username = 'alice123')),
        '2025-06-11 07:00:00', 60, 'Central Park', 'open'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Luna' AND owner_id = (SELECT user_id FROM Users WHERE username = 'emma_owner')),
          '2025-06-11 16:00:00', 30, 'Riverside Trail', 'completed'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Charlie' AND owner_id = (SELECT user_id FROM Users WHERE username = 'carol123')),
          '2025-06-12 10:15:00', 45, 'Dog Beach', 'open');
      `);

      await db.execute(`
        INSERT INTO WalkApplications (request_id, walker_id) VALUES
        ((SELECT request_id FROM WalkRequests WHERE dog_id = (SELECT dog_id FROM Dogs WHERE name = 'Max') AND requested_time = '2025-06-10 08:00:00'),
        (SELECT user_id FROM Users WHERE username = 'bobwalker')),
        ((SELECT request_id FROM WalkRequests WHERE dog_id = (SELECT dog_id FROM Dogs WHERE name = 'Bella') AND requested_time = '2025-06-10 09:30:00'),
        (SELECT user_id FROM Users WHERE username = 'davidwalks')),
        ((SELECT request_id FROM WalkRequests WHERE dog_id = (SELECT dog_id FROM Dogs WHERE name = 'Rocky') AND requested_time = '2025-06-11 07:00:00'),
        (SELECT user_id FROM Users WHERE username = 'bobwalker'));
      `);

      await db.execute(`
        INSERT INTO WalkRatings (request_id, walker_id, owner_id, rating, comments) VALUES
        ((SELECT request_id FROM WalkRequests WHERE dog_id = (SELECT dog_id FROM Dogs WHERE name = 'Luna') AND requested_time = '2025-06-11 16:00:00'),
        (SELECT user_id FROM Users WHERE username = 'davidwalks'),
        (SELECT user_id FROM Users WHERE username = 'emma_owner'),
          5, 'Excellent service! Luna had a great time and came back happy and tired.');
      `);
    }
  } catch (err) {
    console.error('Error setting up database. Ensure Mysql is running: service mysql start', err);
  }
})();

// Route to return books as JSON
app.get('/', async (req, res) => {
  try {
    const [users] = await db.execute('SELECT * FROM Users');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch books' });
  }
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

app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const [requests] = await db.execute(`
      SELECT wr.request_id, d.name as dog_name, wr.requested_time,
             wr.duration_minutes, wr.location, u.username as owner_username
      FROM WalkRequests wr
      JOIN Dogs d ON wr.dog_id = d.dog_id
      JOIN Users u ON d.owner_id = u.user_id
      WHERE wr.status = 'open'
      ORDER BY wr.requested_time
    `);
    res.json(requests);
  } catch (err) {
    console.error('Error fetching open walk requests:', err);
    res.status(500).json({ error: 'Failed to fetch open walk requests' });
  }
});

app.get('/api/walkers/summary', async (req, res) => {
  try {
    const [walkers] = await db.execute(`
      SELECT
        u.username as walker_username,
        COUNT(wr.rating_id) as total_ratings,
        CASE
          WHEN COUNT(wr.rating_id) > 0 THEN AVG(wr.rating)
          ELSE NULL
        END as average_rating,
        COUNT(DISTINCT wa.request_id) as completed_walks
      FROM Users u
      LEFT JOIN WalkApplications wa ON u.user_id = wa.walker_id AND wa.status = 'accepted'
      LEFT JOIN WalkRequests wreq ON wa.request_id = wreq.request_id AND wreq.status = 'completed'
      LEFT JOIN WalkRatings wr ON wa.request_id = wr.request_id AND wr.walker_id = u.user_id
      WHERE u.role = 'walker'
      GROUP BY u.user_id, u.username
      ORDER BY u.username
    `);

    const formattedWalkers = walkers.map(walker => ({
      walker_username: walker.walker_username,
      total_ratings: parseInt(walker.total_ratings),
      average_rating: walker.average_rating ? parseFloat(walker.average_rating) : null,
      completed_walks: parseInt(walker.completed_walks)
    }));
    res.json(formattedWalkers);
  } catch (err) {
    console.error('Error fecthing walker summary:', err);
    res.status(500).json({ error: 'Failed to fetch walker summary' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;

const PORT = 8080;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
