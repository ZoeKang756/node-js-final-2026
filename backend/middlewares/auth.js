const jwt = require("jsonwebtoken");
const generateError = require("../utils/generateError");
const resultHeader = require("../utils/resultHeader");

function formatVerifyError(jwtError) {
  let result;
  switch (jwtError.name) {
    case "TokenExpiredError":
      result = generateError.init(
        generateError.STATUS_CODE.PERMISSION_DENIED,
        generateError.STATUS_MSG.PERMISSION_EXPIRED,
      );
      break;
    default:
      result = generateError.init(
        generateError.STATUS_CODE.PERMISSION_DENIED,
        generateError.STATUS_MSG.PERMISSION_INVALID,
      );
      break;
  }
  return result;
}

function verifyJWT(token, secret) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, (error, decoded) => {
      if (error) {
        reject(formatVerifyError(error));
      } else {
        resolve(decoded);
      }
    });
  });
}

module.exports = ({ secret, userRepository, logger = console }) => {
  if (!secret || typeof secret !== "string") {
    logger.error("[AuthV2] secret is required and must be a string.");
    throw new Error("[AuthV2] secret is required and must be a string.");
  }
  if (
    !userRepository ||
    typeof userRepository !== "object" ||
    typeof userRepository.findOneBy !== "function"
  ) {
    logger.error("[AuthV2] userRepository is required and must be a function.");
    throw new Error(
      "[AuthV2] userRepository is required and must be a function.",
    );
  }
  return async (req, res, next) => {
    if (
      !req.headers ||
      !req.headers.authorization ||
      !req.headers.authorization.startsWith("Bearer")
    ) {
      logger.warn("[AuthV2] Missing authorization header.");
      resultHeader(res, 401, "failed", { message: "請先登入" });
      return;
    }
    const [, token] = req.headers.authorization.split(" ");

    if (!token) {
      logger.warn("[AuthV2] Missing token.");
      resultHeader(res, 401, "failed", { message: "請先登入" });
      return;
    }
    try {
      const verifyResult = await verifyJWT(token, secret);
      const user = await userRepository.findOneBy({ id: verifyResult.id });
      if (!user) {
        resultHeader(res, 401, "failed", { message: "無效的 token" });
        return;
      }
      req.user = user;
      next();
    } catch (error) {
      logger.error(`[AuthV2] ${error.message}`);
      next(error);
    }
  };
};
