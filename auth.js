const auth = require("basic-auth");
const admin = { name: "user", password: "password" };

module.exports = (req, res, next) => {
  /*
  const user = auth(req);
  if (!user || !admin.name || admin.password !== user.pass) {
    res.set("WWW-Authenticate", 'Basic realm="Authenticate"');
    return res.status(401).send();
  }
  */
  return next();
};
