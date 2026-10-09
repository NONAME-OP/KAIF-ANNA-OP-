const util = require('util');
if (!util.styleText) {
  util.styleText = (format, text) => text;
}
