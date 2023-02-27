/* eslint-disable camelcase */
/* eslint-disable require-jsdoc */
("use strict");

// converters

const zeroPad = (num, places) => String(num).padStart(places, "0");

function rel_seconds_to_readable_time(totalSeconds) {
  // based https://codingbeautydev.com/blog/javascript-convert-seconds-to-hours-and-minutes/
  totalSeconds = Math.floor(totalSeconds);
  if (totalSeconds < 0) {
    totalSeconds = 0;
  }
  if (totalSeconds < 60) {
    return totalSeconds.toString() + "s";
  } else if (totalSeconds < 3600) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes.toString() + ":" + zeroPad(seconds, 2) + "min";
  } else if (totalSeconds < 86400) {
    // 3600*24
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.round((totalSeconds - hours * 3600) / 60);
    return hours.toString() + ":" + zeroPad(minutes, 2) + "h";
  } else {
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.round((totalSeconds - days * 86400) / 3600);
    return days.toString() + "d " + hours.toString() + "h";
  }
}

function calc_speed_in_unit(items_per_min, speed_unit) {
  // unit: per Minute/Hour/Day
  let speed = 0;
  if (speed_unit === "Minute") {
    speed = Math.abs(Math.round(10 * items_per_min) / 10);
  } else if (speed_unit === "Hour") {
    speed = Math.abs(Math.round(10 * 60 * items_per_min) / 10);
  } else if (speed_unit === "Day") {
    speed = Math.abs(Math.round(10 * 1440 * items_per_min) / 10);
  }
  return speed;
}

function timestamp_to_datestr(timestamp) {
  const d = new Date(timestamp);
  let date_str = d.toLocaleString("de-DE");
  date_str = date_str.replace(", ", " "); // this is for the DE format 25.2.2023, 10:25:42 -> 25.2.2023 10:25:42
  return date_str;
}

function calc_remaining_items(items, target) {
  if (target === 0) {
    return items;
  } else {
    return target - items;
  }
}

// math helpers

function linreg(x, y) {
  // from https://oliverjumpertz.com/simple-linear-regression-theory-math-and-implementation-in-javascript/
  const sumX = x.reduce((prev, curr) => prev + curr, 0);
  const avgX = sumX / x.length;
  const xDifferencesToAverage = x.map((value) => avgX - value);
  const xDifferencesToAverageSquared = xDifferencesToAverage.map(
    (value) => value ** 2
  );
  const SSxx = xDifferencesToAverageSquared.reduce(
    (prev, curr) => prev + curr,
    0
  );
  const sumY = y.reduce((prev, curr) => prev + curr, 0);
  const avgY = sumY / y.length;
  const yDifferencesToAverage = y.map((value) => avgY - value);
  const xAndYDifferencesMultiplied = xDifferencesToAverage.map(
    (curr, index) => curr * yDifferencesToAverage[index]
  );
  const SSxy = xAndYDifferencesMultiplied.reduce(
    (prev, curr) => prev + curr,
    0
  );
  const slope = SSxy / SSxx;
  const intercept = avgY - slope * avgX;
  return [slope, intercept];
}

// data modification

function calc_row_new_delta(row_new, row_last) {
  // calc items_per_min
  if (row_new["timestamp"] != row_last["timestamp"]) {
    row_new["items_per_min"] =
      (60000 * (row_new["items"] - row_last["items"])) /
      (row_new["timestamp"] - row_last["timestamp"]);
  } else {
    delete row_new["items_per_min"];
  }
  // calc eta
  if ("items_per_min" in row_new && row_new["items_per_min"] != 0) {
    const ts_eta = Math.round(
      row_new["timestamp"] +
        (row_new["remaining"] / row_new["items_per_min"]) * 60000
    );
    row_new["eta_ts"] = ts_eta;
    row_new["eta_str"] = timestamp_to_datestr(ts_eta);
  } else {
    delete row_new["eta_str"];
    delete row_new["eta_ts"];
  }
}

function sort_data(data) {
  // sorting from https://stackoverflow.com/questions/1129216/sort-array-of-objects-by-string-property-value
  // console.log(data);
  if (data.length > 1) {
    data.sort((a, b) => a.timestamp - b.timestamp);
  }
  if (data.length > 0) {
    // remove items_per_min from new first item
    delete data[0]["items_per_min"];
    // re-calculate items per minute
    for (let i = 1; i < data.length; i++) {
      calc_row_new_delta(data[i], data[i - 1]);
    }
  }
  // console.log(data);
  window.localStorage.setItem("eta_data", JSON.stringify(data));
}

// Export functions, needed for Jest unittests
// Using this hack it works for both, jest and browser.
// from https://stackoverflow.com/questions/66349868/jest-unit-testing-module-export-error-in-browser-console
// var instead of const needed here
// eslint-disable-next-line no-var
var module = module || {};
module.exports = {
  zeroPad,
  rel_seconds_to_readable_time,
  calc_speed_in_unit,
  timestamp_to_datestr,
  calc_remaining_items,
  linreg,
  calc_row_new_delta,
  sort_data,
};
