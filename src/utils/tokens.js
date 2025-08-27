const crypto = require('crypto');
const jwt = require('jsonwebtoken');

function signJWT(payload, expiresIn = '7d') {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

function verifyJWT(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

function addHours(date, hrs) {
  const d = new Date(date);
  d.setHours(d.getHours() + hrs);
  return d;
}

module.exports = { signJWT, verifyJWT, randomToken, addHours };
