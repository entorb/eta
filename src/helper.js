/* eslint-disable camelcase */
"use strict";

// converters

const zeroPad = (num, places) => String(num).padStart(places, "0");

/**
 * Convert a duration in seconds to a human readable format.
 * @param {int} totalSeconds
 * @return {string} of days/hours/minutes/seconds
 */
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
/**
 * Convert items_per_min to items_per_hour or items_per_day.
 * @param {float} items_per_min
 * @param {string} speed_unit : Minute/Hour/Day
 * @return {float} speed in speed_unit, rounded to 1 digit
 */
function calc_speed_in_unit(items_per_min, speed_unit) {
  let speed = 0;
  if (speed_unit === "Minute") {
    speed = items_per_min;
  } else if (speed_unit === "Hour") {
    speed = 60 * items_per_min;
  } else if (speed_unit === "Day") {
    speed = 1440 * items_per_min;
  } else {
    console.log("unknown unit " + speed_unit);
  }
  // abs and round to 1 digit
  speed = Math.abs(Math.round(10 * speed) / 10);
  return speed;
}

/**
 * Convert timestamp to date string.
 * @param {int} timestamp in ms
 * @return {string} date like 25.2.2023 10:25:42
 */
function timestamp_to_datestr(timestamp) {
  const d = new Date(timestamp);
  let date_str = d.toLocaleString("de-DE");
  date_str = date_str.replace(", ", " "); // this is for the DE format 25.2.2023, 10:25:42 -> 25.2.2023 10:25:42
  return date_str;
}

/**
 * Calc remaining items.
 * @param {float} items
 * @param {float} target
 * @return {float} remaining items
 */
function calc_remaining_items(items, target) {
  if (target === 0) {
    return items;
  } else {
    return target - items;
  }
}

// math helpers
/**
 * Check if a string is numeric.
 * @param {str} str input string
 * @return {bool}
 */
function isNumeric(str) {
  // from https://stackoverflow.com/questions/175739/how-can-i-check-if-a-string-is-a-valid-number
  // if (typeof str != "string") return false; // we only process strings!
  return (
    !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
    !isNaN(parseFloat(str))
    // ...and ensure strings of whitespace fail
  );
}

/**
 * Perform linear regression calculation.
 * @param {Array} x
 * @param {Array} y
 * @return {Array} of slope, intercept
 */
function linreg(x, y) {
  // from https://oliverjumpertz.com/simple-linear-regression-theory-math-and-implementation-in-javascript/
  if (x.length !== y.length) {
    throw new Error("Arrays x and y must have the same length.");
  }
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

/**
 * Perform weighted linear regression calculation with normalized weights.
 * @param {Array} x
 * @param {Array} y
 * @return {Array} of weighted slope, weighted intercept
 */
function linreg_weighted(x, y) {
  if (x.length !== y.length) {
    throw new Error("Arrays x and y must have the same length.");
  }

  const n = x.length;
  let sumWeightedX = 0;
  let sumWeightedY = 0;
  let sumWeight = 0;

  for (let i = 0; i < n; i++) {
    const weight = i + 1; // Normalized weight based on position in the list.
    sumWeight += weight;
    sumWeightedX += x[i] * weight;
    sumWeightedY += y[i] * weight;
  }

  const weightedAvgX = sumWeightedX / sumWeight;
  const weightedAvgY = sumWeightedY / sumWeight;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    const weight = i + 1;
    numerator += weight * (x[i] - weightedAvgX) * (y[i] - weightedAvgY);
    denominator += weight * (x[i] - weightedAvgX) ** 2;
  }

  const weightedSlope = numerator / denominator;
  const weightedIntercept = weightedAvgY - weightedSlope * weightedAvgX;

  return [weightedSlope, weightedIntercept];
}

// data modification

/**
 * Compares row_new to row_last and calculates items_per_min and eta from the delta
 * @param {Object} row_new
 * @param {Object} row_last
 * @return {Object} row_new
 */
function calc_row_new_delta(row_new, row_last) {
  // modifies row_new
  // calc items_per_min
  if (row_new["timestamp"] !== row_last["timestamp"]) {
    row_new["items_per_min"] =
      -(60000 * (row_new["remaining"] - row_last["remaining"])) /
      (row_new["timestamp"] - row_last["timestamp"]);
    // TODO: recalc all if unit changes
    row_new["speed"] = calc_speed_in_unit(
      row_new["items_per_min"],
      total_speed_time_unit
    );
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
  return row_new;
}

/**
 * Sort data Array, recalculate items_per_min, update localStorage
 * @param {Array} data
 * @return {Array} data
 */
function sort_data(data) {
  /* istanbul ignore else */
  if (data.length <= 0) {
    return data;
  }
  // sorting from https://stackoverflow.com/questions/1129216/sort-array-of-objects-by-string-property-value
  // console.log(data);
  /* istanbul ignore else */
  if (data.length > 1) {
    data.sort((a, b) => a.timestamp - b.timestamp);
  }
  // console.log(data);
  window.localStorage.setItem("eta_data", JSON.stringify(data));
  data = recalc_IpM_and_speed(data);
  return data;
}

/**
 * read data Array, recalculate items_per_min
 * does not update local storage
 * @param {Array} data
 * @return {Array} data
 */
function recalc_IpM_and_speed(data) {
  if (data.length <= 0) {
    return data;
  }
  console.log("deleting from data[0]");
  // remove items_per_min from new first item
  delete data[0]["items_per_min"];
  delete data[0]["speed"];
  if (data.length > 1) {
    // re-calculate items per minute
    for (let i = 1; i < data.length; i++) {
      data[i] = calc_row_new_delta(data[i], data[i - 1]);
    }
  }
  return data;
}

// interactions with HTML elements
/**
 * Read value of an html input field, convert to Number
 * @param {*} html_input
 * @return {float}, 0 in case field is non-nummeric
 */
function read_html_input_number(html_input) {
  console.log("fnc read_html_input_number()");
  if (!html_input.value) {
    console.log("value empty, returning 0");
    return 0;
  }
  const value_str = html_input.value.replace(",", ".").replace(" ", "");
  if (!isNumeric(value_str)) {
    return 0;
  }
  return Number(value_str);
}

/**
 * play a sound of mp3 format
 * @param {*} url of mp3 sound file
 */
function playSound(url) {
  const audio = new Audio(url);
  audio.play();
}

/**
 * Play sound file for timer done
 */
function playSoundTimerDone() {
  playSound('audio/481151__matrixxx__cow-bells-01.mp3');
}



// Export functions, needed for Jest unittests
// Using this hack it works for both, jest and browser.
// from https://stackoverflow.com/questions/66349868/jest-unit-testing-module-export-error-in-browser-console
// var instead of const needed here
/* istanbul ignore next */
// eslint-disable-next-line no-var
var module = module || {};
module.exports = {
  zeroPad,
  rel_seconds_to_readable_time,
  calc_speed_in_unit,
  timestamp_to_datestr,
  calc_remaining_items,
  isNumeric,
  linreg,
  linreg_weighted,
  calc_row_new_delta,
  sort_data,
  read_html_input_number,
  playSound,
  playSoundTimerDone,
};
