const { validationResult } = require('express-validator');

// Runs after an express-validator chain; short-circuits with the first
// validation error instead of reaching the route handler.
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
}

module.exports = validate;
