const resultHeader = require("../utils/resultHeader");

module.exports = (req, res, next) => {
  if (!req.user || req.user.role !== "COACH") {
    resultHeader(res, 401, "failed", { message: "使用者尚未成為教練" });
    return;
  }
  next();
};
