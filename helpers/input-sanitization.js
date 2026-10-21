import xss from 'xss-clean';
import validator from 'validator';

function deepSanitize(obj) {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      let val = obj[key].trim();

      // Escape HTML (e.g. "<" becomes "&lt;")
      val = validator.escape(val);

      // Remove non-printable characters (keep newlines)
      val = validator.stripLow(val, true);

      obj[key] = val;
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      deepSanitize(obj[key]);
    }
  }
}

const sanitizeInput = [
  // Apply xss-clean middleware
  xss(),

  // Custom deep sanitizer
  (req, res, next) => {
    if (req.body) deepSanitize(req.body);
    if (req.query) deepSanitize(req.query);
    if (req.params) deepSanitize(req.params);
    next();
  },
];

export default sanitizeInput;
