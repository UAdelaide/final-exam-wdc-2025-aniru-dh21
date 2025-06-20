const express = require('express');
const router = express.Router();
const db = require('../models/db');

// GET all walk requests (for walkers to view)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT wr.*, d.name AS dog_name, d.size, u.username AS owner_name
      FROM WalkRequests wr
      JOIN Dogs d ON wr.dog_id = d.dog_id
      JOIN Users u ON d.owner_id = u.user_id
      WHERE wr.status = 'open'
    `);
    res.json(rows);
  } catch (error) {
    console.error('SQL Error:', error);
    res.status(500).json({ error: 'Failed to fetch walk requests' });
  }
});

// POST a new walk request (from owner)
router.post('/', async (req, res) => {
  const { dog_id, requested_time, duration_minutes, location } = req.body;

  try {
    const [result] = await db.query(`
      INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location)
      VALUES (?, ?, ?, ?)
    `, [dog_id, requested_time, duration_minutes, location]);

    res.status(201).json({ message: 'Walk request created', request_id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create walk request' });
  }
});

// POST an application to walk a dog (from walker)
router.post('/:id/apply', async (req, res) => {
  const requestId = req.params.id;
  const { walker_id } = req.body;

  try {
    // First, check if this walker has already applied for this walk
    const [existingApplication] = await db.query(`
      SELECT application_id FROM WalkApplications
      WHERE request_id = ? AND walker_id = ?
    `, [requestId, walker_id]);

    if (existingApplication.length > 0) {
      return res.status(400).json({ error: 'You have already applied for this walk' });
    }

    // Check if the walk request is still open
    const [walkRequest] = await db.query(`
      SELECT status FROM WalkRequests WHERE request_id = ?
    `, [requestId]);

    if (walkRequest.length === 0) {
      return res.status(404).json({ error: 'Walk request not found' });
    }

    if (walkRequest[0].status !== 'open') {
      return res.status(400).json({ error: 'This walk request is no longer available' });
    }

    // Insert the application
    await db.query(`
      INSERT INTO WalkApplications (request_id, walker_id, status)
      VALUES (?, ?, 'pending')
    `, [requestId, walker_id]);

    // Note: We're NOT changing the WalkRequest status to 'accepted' here
    // The status should remain 'open' until the owner selects a walker
    // You might want to implement an endpoint for owners to accept/reject applications

    res.status(201).json({ message: 'Application submitted successfully' });
  } catch (error) {
    console.error('SQL Error:', error);
    res.status(500).json({ error: 'Failed to apply for walk' });
  }
});

// Optional: Add endpoint for owners to accept applications
router.post('/:id/accept/:applicationId', async (req, res) => {
  const requestId = req.params.id;
  const applicationId = req.params.applicationId;

  try {
    // Start transaction
    await db.query('START TRANSACTION');

    // Update the specific application to 'accepted'
    await db.query(`
      UPDATE WalkApplications
      SET status = 'accepted'
      WHERE application_id = ? AND request_id = ?
    `, [applicationId, requestId]);

    // Update walk request status to 'accepted'
    await db.query(`
      UPDATE WalkRequests
      SET status = 'accepted'
      WHERE request_id = ?
    `, [requestId]);

    // Reject all other applications for this request
    await db.query(`
      UPDATE WalkApplications
      SET status = 'rejected'
      WHERE request_id = ? AND application_id != ?
    `, [requestId, applicationId]);

    // Commit transaction
    await db.query('COMMIT');

    res.json({ message: 'Application accepted successfully' });
  } catch (error) {
    // Rollback transaction on error
    await db.query('ROLLBACK');
    console.error('SQL Error:', error);
    res.status(500).json({ error: 'Failed to accept application' });
  }
});

module.exports = router;