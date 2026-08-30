const validCheck = {
  isUndefined: function (value) {
    return value === undefined;
  },
  isNotString: function (value, max = 0) {
    return (
      typeof value !== "string" ||
      value.trim().length === 0 ||
      (max > 0 && value.trim().length > max)
    );
  },
  isNotNoSymbolString: function (value) {
    if (typeof value !== "string" || value.trim().length === 0) return true;
    let pattern = /^[0-9a-zA-Z\u4e00-\u9fa5]+$/;
    return !pattern.test(value);
  },
  isNotInteger: function (value) {
    return typeof value !== "number" || value < 0 || value % 1 !== 0;
  },
  isNotNumeric: function (value) {
    return typeof value !== "number" || value < 0;
  },
  isNotEmail: function (value) {
    if (typeof value !== "string") return true;
    let pattern =
      /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;
    return !pattern.test(value);
  },
  isNotUrl: function (value, https = false) {
    if (typeof value !== "string") return true;

    let pattern = https
      ? /^https:\/\/([\w-]+\.)+[\w-]+(\/[\w\-.\/?%&=]*)?$/ // 強制只能 https
      : /^https?:\/\/([\w-]+\.)+[\w-]+(\/[\w\-.\/?%&=]*)?$/; // http 或 https 都可以
    return !pattern.test(value);
  },
  isNotPng: function (value) {
    if (typeof value !== "string") return true;
    let pattern = /[^\s]+\.(png|PNG)$/;
    return !pattern.test(value);
  },
  isNotJpg: function (value) {
    if (typeof value !== "string") return true;
    let pattern = /[^\s]+\.(jpg|jpeg|JPG|JPEG)$/;
    return !pattern.test(value);
  },
  isNotValidStrLen: function (value, min = 0, max = 0) {
    if (typeof value !== "string" && !Array.isArray(value)) return true;
    return value.length > max || value.length < min;
  },
  isNotPwd: function (value, pwdPattern) {
    if (typeof value !== "string" || !(pwdPattern instanceof RegExp))
      return true;
    return !pwdPattern.test(value);
  },
  isNotUUID: function (value) {
    if (typeof value !== "string") return true;
    let pattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return !pattern.test(value);
  },
  isNotDateTime: function (value) {
    if (typeof value !== "string") return true;

    // 同時支援兩種格式：
    // 1. "YYYY-MM-DD HH:mm:ss" 或 "YYYY/MM/DD HH:mm:ss"（無時區）
    // 2. "YYYY-MM-DDTHH:mm:ss(.sss)?Z?"（ISO 8601，可帶毫秒與 Z）
    let pattern =
      /^(\d{4})(-|\/)(\d{2})\2(\d{2})([ T])(\d{2}):(\d{2}):(\d{2})(\.\d{1,3})?(Z)?$/;

    let match = value.match(pattern);
    if (!match) return true;

    let [
      ,
      year,
      ,
      month,
      day,
      separator, // " " 或 "T"
      hour,
      minute,
      second,
      ,
      hasZ, // "Z" 或 undefined
    ] = match;

    // 有 T 或 Z，視為明確帶時區資訊的 ISO 格式 → 直接交給 Date 解析（可靠）
    if (separator === "T" || hasZ) {
      let date = new Date(value);
      if (date.toString() === "Invalid Date" || isNaN(date)) return true;
      return false; // ISO 格式交給原生解析即可，不需再手動校正
    }

    // 沒有 T/Z，屬於本地時間格式 → 統一組成 ISO 再手動校正，避免 "/" 分隔符解析失敗
    let isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    let date = new Date(isoString);
    if (date.toString() === "Invalid Date" || isNaN(date)) return true;

    return (
      date.getFullYear() !== Number(year) ||
      date.getMonth() + 1 !== Number(month) ||
      date.getDate() !== Number(day) ||
      date.getHours() !== Number(hour) ||
      date.getMinutes() !== Number(minute) ||
      date.getSeconds() !== Number(second)
    );
  },
};

module.exports = validCheck;
