const pad = (n) => String(n).padStart(2, "0");

const getFormatDateRange = function (dateString, showSecond = true) {
    const d = new Date(dateString);
    const year = d.getFullYear();
    const month = d.getMonth();

    const firstDate = `${year}-${pad(month + 1)}-01`;
    // month+1 的第 0 天 = 該月最後一天
    const lastDay = new Date(year, month + 1, 0).getDate();
    const lastDate = `${year}-${pad(month + 1)}-${pad(lastDay)}`;

    return showSecond
        ? { start: `${firstDate} 00:00:00`, end: `${lastDate} 23:59:59` }
        : { start: firstDate, end: lastDate };
};

module.exports = getFormatDateRange;