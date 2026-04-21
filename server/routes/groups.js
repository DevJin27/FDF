const express = require('express');
const groupService = require('../services/groupService');
const { getGroup } = require('../state');

const router = express.Router();

router.post('/api/groups', (req, res) => {
  try {
    const { name, address, hostId, hostName } = req.body || {};

    if (!name || !address || !hostId || !hostName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const group = groupService.createGroup({ name, address, hostId, hostName });
    return res.status(201).json({ group });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to create group' });
  }
});

router.post('/api/groups/join', (req, res) => {
  try {
    const { code, userId, userName } = req.body || {};
    const group = groupService.joinGroup({ code, userId, userName });
    return res.status(200).json({ group });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/api/groups/:id', (req, res) => {
  try {
    const group = getGroup(req.params.id);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    return res.status(200).json({ group });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch group' });
  }
});

module.exports = router;
