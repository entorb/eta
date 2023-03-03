/* eslint-disable camelcase */
/* eslint-disable require-jsdoc */
("use strict");

/*
DONE
if mode = countdown -> items < last_items
if mode = target -> items > last_items
wget script for download libs
store/move target to eta_settings
add modes: decrease to 0 / increase to target
reset should delete eta_settings as well
download data and upload data
chart: add speed from linreg-slope (items per min)
table: hide column remaining for count-down mode
add historical data
table: remove rows (and recalc the speed afterwards)
chart: select what to plot: items, items/min, ETA
remaining time: render text dynamically: days, hours, min, sec
remaining time: update dynamically every second
speed unit auto: per min / per hour / per day
refactoring: extract helper functions separate file
apply ESLint and Prettier
use jest for unit tests
download CSV data
runtime: dynamically update as well
set target: allow change of target and trigger recalc of remaining items for all rows
100% test coverage for helper.js
enter delta
enter remaining
prevent entering non-numbers

TODO/IDEAS
chart: choose to display remaining instead of items
tabulator: use global data, and update column speed name upon switching unit
echarts: use global data, and update speed unit
*/

// html elements
const html_input_target = document.getElementById("input_target");
const html_input_items = document.getElementById("input_items");
const html_input_remaining = document.getElementById("input_remaining");
const html_input_delta = document.getElementById("input_delta");
const html_div_chart = document.getElementById("div_chart");
const html_text_eta = document.getElementById("text_eta");
const html_text_remaining = document.getElementById("text_remaining");
const html_text_speed = document.getElementById("text_speed");
const html_text_start = document.getElementById("text_start");
const html_text_runtime = document.getElementById("text_runtime");
const html_text_pct = document.getElementById("text_pct");
const html_input_hist_datetime = document.getElementById("input_hist_datetime");
const html_input_hist_items = document.getElementById("input_hist_items");
const html_sel_chart_y2 = document.getElementById("sel_chart_y2");
const html_a_download_csv = document.getElementById("a_download_json");

// global variables
let data;
let settings;
let total_items_per_min = 0;
let total_timestamp_eta = Date.now();
let total_speed_time_unit = "Minute"; // Minute/Hour/Day

// read browser's local storage for last session data
{
  const localStorageData = window.localStorage.getItem("eta_data");
  if (localStorageData) {
    data = JSON.parse(localStorageData);
  } else {
    data = [];
  }

  const localStorageSettings = window.localStorage.getItem("eta_settings");
  if (localStorageSettings) {
    settings = JSON.parse(localStorageSettings);
    html_input_target.value = settings["target"];
  } else {
    settings = {};
  }
}

// Table

const table = table_create();

// Chart

const chart = echarts.init(html_div_chart);
// https://echarts.apache.org/en/option.html#color
// const chart_colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'];
chart.setOption({
  // title: { text: 'Items per Minute' },
  tooltip: {},
  legend: {},
  grid: {
    // define margins
    containLabel: false,
    left: 50,
    bottom: 20,
    top: 30,
    right: 150,
  },
});

function chart_update() {
  console.log("fnc chart_update()");
  const chart_colors = ["#3ba272", "#5470c6", "#91cc75"];
  const data_echarts_items = [];
  const data_echarts_speed = [];
  const data_echarts_eta = [];
  const y2_series = html_sel_chart_y2.value;

  // populate data arrays
  // TODO: only calc the ones need for the selected y2_series
  for (let i = 0; i < data.length; i++) {
    // clone, see update_table
    const row = Object.assign({}, data[i]);
    data_echarts_items.push([new Date(row["timestamp"]), row["items"]]);
    if ("items_per_min" in row) {
      data_echarts_speed.push([
        new Date(row["timestamp"]),
        calc_speed_in_unit(row["items_per_min"], total_speed_time_unit),
      ]);
    }
    if ("items_per_min" in row) {
      data_echarts_eta.push([
        new Date(row["timestamp"]),
        new Date(row["eta_ts"]),
      ]);
    }
  }

  // generate settings per Axis
  // TODO: only generate the ones need for the selected y2_series
  const yAxis_items = {
    name: "Items",
    position: "left",
    type: "value",
    nameTextStyle: { color: chart_colors[0] },
    axisLabel: {
      textStyle: {
        color: chart_colors[0],
      },
    },
  };

  const yAxis2_common = {
    position: "right",
    nameTextStyle: { color: chart_colors[1] },
    axisLabel: { textStyle: { color: chart_colors[1] } },
    splitLine: { show: false }, // no grid line
  };

  const yAxis2_speed = {
    ...yAxis2_common,
    ...{
      name: "Items/" + total_speed_time_unit,
      type: "value",
    },
  };

  const yAxis2_eta = {
    ...yAxis2_common,
    ...{
      name: "ETA",
      type: "time",
    },
  };

  const series_common = {
    type: "line",
    smooth: true,
    symbolSize: 10,
    silent: true,
    animation: false,
  };

  const series_items = {
    ...series_common,
    ...{
      yAxisIndex: 0,
      data: data_echarts_items,
      color: chart_colors[0],
      areaStyle: { opacity: 0.5 },
    },
  };

  const series_speed = {
    ...series_common,
    ...{
      yAxisIndex: 1,
      color: chart_colors[1],
      data: data_echarts_speed,
      markLine: {
        symbol: "none",
        label: { show: false },
        silent: true,
        animation: true,
        data: [{ yAxis: total_items_per_min }],
      },
    },
  };

  const series_eta = {
    ...series_common,
    ...{
      yAxisIndex: 1,
      color: chart_colors[1],
      data: data_echarts_eta,
      markLine: {
        symbol: "none",
        label: { show: false },
        silent: true,
        animation: true,
        data: [{ yAxis: new Date(total_timestamp_eta) }],
      },
    },
  };

  if (y2_series === "speed") {
    chart.setOption({
      series: [series_items, series_speed],
      xAxis: { type: "time" },
      yAxis: [yAxis_items, yAxis2_speed],
    });
  } else if (y2_series === "eta") {
    chart.setOption({
      series: [series_items, series_eta],
      xAxis: { type: "time" },
      yAxis: [yAxis_items, yAxis2_eta],
    });
  }
}

// update functions

function update_total_eta_and_speed() {
  console.log("fnc update_total_eta_and_speed()");
  const last_row = data.slice(-1)[0];
  const xArray = [];
  const yArray = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    xArray.push(row["timestamp"]);
    yArray.push(row["remaining"]);
  }
  // const [slope, intercept] = linreg(xArray, yArray);
  const slope = linreg(xArray, yArray)[0];
  // slope = speed in items/ms
  // slope of remaining items is negative

  total_timestamp_eta = Math.round(
    last_row["timestamp"] + (-1 * last_row["remaining"]) / slope
  );
  html_text_eta.innerHTML =
    "<b>" + timestamp_to_datestr(total_timestamp_eta) + "</b>";

  // ensure total_items_per_min to be positive
  total_items_per_min = Math.abs(slope) * 60000;
  if (total_items_per_min > 0.5) {
    total_speed_time_unit = "Minute";
    html_text_speed.innerHTML =
      Math.round(10 * total_items_per_min) / 10 + " Items/min";
  } else if (total_items_per_min * 60 > 0.5) {
    total_speed_time_unit = "Hour";
    html_text_speed.innerHTML =
      Math.round(10 * total_items_per_min * 60) / 10 + " Items/h";
  } else {
    total_speed_time_unit = "Day";
    html_text_speed.innerHTML =
      Math.round(10 * total_items_per_min * 1440) / 10 + " Items/d";
  }
  update_timers();

  // stop auto-refresh timer
  clearInterval(interval_auto_refresh);

  // re-initialize the auto-refresh timer
  const min_remaining = (total_timestamp_eta - Date.now()) / 60 / 1000;
  if (min_remaining > 0) {
    let time_sleeptime = 1000;
    if (min_remaining > 60) {
      // once per min for > 1 hour remaining time
      time_sleeptime = 60000;
    }
    interval_auto_refresh = setInterval(update_timers, time_sleeptime);
  }
}

function update_timers() {
  console.log("fnc update_timers()");
  if (data.length === 0) {
    console.log("data empty, nothing to do");
    return;
  }
  const ms_passed = Date.now() - data[0]["timestamp"];
  let ms_remaining = total_timestamp_eta - Date.now();
  if (ms_remaining < 0) {
    ms_remaining = 0;
    // stop timer
    clearInterval(interval_auto_refresh);
  }
  html_text_remaining.innerHTML =
    "<b>" + rel_seconds_to_readable_time(ms_remaining / 1000) + "</b>";
  html_text_runtime.innerHTML = rel_seconds_to_readable_time(ms_passed / 1000);
}

function update_start_and_pct() {
  console.log("fnc update_start_and_pct()");
  if (data.length === 0) {
    console.log("data empty, nothing to do");
    return;
  }
  const ts_first = data[0]["timestamp"];
  html_text_start.innerHTML = timestamp_to_datestr(ts_first);

  let percent;
  const row_first = data[0];
  const row_last = data.slice(-1)[0];
  if (settings["target"] === 0) {
    // remaining is neg for all rows
    percent =
      Math.round(
        10 * (100 - (100 * row_last["remaining"]) / row_first["remaining"])
      ) / 10;
  } else {
    // remaining is pos for all rows
    percent =
      Math.round(
        10 *
          ((100 * row_last["items"]) /
            (row_first["items"] + row_first["remaining"]))
      ) / 10;
  }
  html_text_pct.innerHTML = percent + "%";
}

function update_displays() {
  console.log("fnc update_displays()");
  if (data.length > 0) {
    update_start_and_pct();
    table_update(data, total_speed_time_unit);
    if (data.length >= 2) {
      update_total_eta_and_speed();
      chart_update();
    }
  }
}

function reset() {
  console.log("fnc reset()");
  clearInterval(interval_auto_refresh);
  data = [];
  settings = {};
  total_items_per_min = 0;
  total_speed_time_unit = "Minute";
  // window.localStorage.setItem("eta_data", JSON.stringify(data));
  window.localStorage.removeItem("eta_data");
  window.localStorage.removeItem("eta_settings");
  html_text_eta.innerHTML = "&nbsp;";
  html_text_remaining.innerHTML = "&nbsp;";
  html_text_start.innerHTML = "&nbsp;";
  html_text_runtime.innerHTML = "&nbsp;";
  html_text_pct.innerHTML = "&nbsp;";
  html_text_speed.innerHTML = "&nbsp;";
  table_update(data, total_speed_time_unit);
  chart_update();
}

// set data

function set_target() {
  console.log("fnc set_target()");
  let target_new;

  // read input
  if (!html_input_target.value) {
    target_new = 0;
    html_input_target.value = 0;
  } else {
    target_new = Number(html_input_target.value.replace(",", "."));
  }

  // validation
  if (target_new < 0) {
    console.log("new target negativ");
    alert("Target must be positiv.");
    return;
  }
  if (target_new === settings["target"]) {
    console.log("target unchanged");
    return;
  }
  if (settings["target"] === 0 && target_new > 0 && data.length > 0) {
    console.log("old target=0, new target!=0, data existing");
    alert(
      "In mode countdown target change is not allowed, delete existing data first."
    );
    html_input_target.value = 0;
    return;
  }

  // persist the new target
  console.log("target changed to " + target_new);
  settings["target"] = target_new;
  window.localStorage.setItem("eta_settings", JSON.stringify(settings));

  // update re-calculate remaining items for existing data
  if (data.length > 0) {
    data.forEach(function (row) {
      row["remaining"] = calc_remaining_items(row["items"], settings["target"]);
    });
    // re-calculate eta
    for (let i = 1; i < data.length; i++) {
      data[i] = calc_row_new_delta(data[i], data[i - 1]);
    }
    update_displays();
  }

  if (settings["target"] === 0) {
    table.hideColumn("remaining");
  } else {
    table.showColumn("remaining");
  }
}

function add_items(items) {
  console.log("fnc add_items()");
  const target = settings["target"];
  // checks regarding target
  if (items < 0) {
    alert("New entry (" + items + ") must be positive.");
    return;
  }
  if (target > 0 && items > target) {
    alert("New entry (" + items + ") must not exceed target (" + target + ").");
    return;
  }
  // checks regarding last row
  // data already present before we add the new row
  if (data.length >= 1) {
    const row_last = data.slice(-1)[0];
    // in mode=countdown, we only except decreasing values
    if (target === 0 && items >= row_last["items"]) {
      alert(
        "New entry (" +
          items +
          ") must be < previous entry (" +
          row_last["items"] +
          ") in countdown mode."
      );
      return;
    }
    // in mode=countup, we only except increasing values
    if (target > 0 && items <= row_last["items"]) {
      alert(
        "New entry (" +
          items +
          ") must be > previous entry (" +
          row_last["items"] +
          ") in countup mode."
      );
      return;
    }
  }

  // append row
  const d = new Date();
  const timestamp = d.getTime();
  let row_new = {
    timestamp: timestamp,
    items: items,
    remaining: calc_remaining_items(items, settings["target"]),
  };

  if (data.length >= 1) {
    const row_last = data.slice(-1)[0];
    row_new = calc_row_new_delta(row_new, row_last);
  }
  data.push(row_new);
  window.localStorage.setItem("eta_data", JSON.stringify(data));
  update_displays();
}

function add_read_field_and_prepare(html_input) {
  console.log("fnc add_read_field_and_prepare()");
  if (!html_input.value) {
    console.log("value empty");
    return;
  }
  if (!("target" in settings)) {
    console.log("setting target prio to adding");
    set_target();
  }
  const value_str = html_input.value.replace(",", ".").replace(" ", "");
  if (!isNumeric(value_str)) {
    return 0;
  }
  return Number(value_str);
}

// FE EventListener

html_input_target.addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    action_set_target();
  }
});
html_input_items.addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    action_add_items();
  }
});
html_input_remaining.addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    action_add_remaining();
  }
});
html_input_delta.addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    action_add_delta();
  }
});
html_input_hist_items.addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    action_add_hist();
  }
});

// user-triggered actions/functions

function action_set_target() {
  console.log("fnc action_set_target()");
  set_target();
}

function action_add_items() {
  console.log("fnc action_add_items()");
  const items = add_read_field_and_prepare(html_input_items);
  add_items(items);
  html_input_items.value = "";
}

function action_add_remaining() {
  console.log("fnc action_add_remaining()");
  const remaining = add_read_field_and_prepare(html_input_remaining);
  if (settings["target"] === 0) {
    add_items(remaining);
  } else {
    add_items(settings["target"] - remaining);
  }
  html_input_remaining.value = "";
}

function action_add_delta() {
  console.log("fnc action_add_delta()");
  if (data.length === 0) {
    console.log("data empty, nothing to do");
    return;
  }
  const delta = add_read_field_and_prepare(html_input_delta);
  const row_last = data.slice(-1)[0];

  if (settings["target"] === 0) {
    add_items(row_last["items"] - delta);
  } else {
    add_items(row_last["items"] + delta);
  }
  html_input_delta.value = "";
}

// eslint-disable-next-line no-unused-vars
function action_reset() {
  console.log("fnc action_reset()");
  reset();
}

// eslint-disable-next-line no-unused-vars
function action_table_delete_rows() {
  console.log("fnc action_table_delete_rows()");
  // const selectedRows = table.getSelectedRows();
  const selectedData = table.getSelectedData();
  if (selectedData.length === data.length) {
    // delete all via reset()
    reset();
    console.log("deleting all table data");
    return;
  }
  for (let i = 0; i < selectedData.length; i++) {
    const row = selectedData[i];
    const timestamp_to_delete = row["timestamp"];
    for (let j = data.length - 1; j >= 0; --j) {
      if (data[j]["timestamp"] === timestamp_to_delete) {
        data.splice(j, 1);
      }
    }
  }
  // TODO: sort not needed, but was too lazy to add another function
  data = sort_data(data);
  update_displays();
}

// eslint-disable-next-line no-unused-vars
function action_chart_series_selection_changed() {
  console.log("fnc action_chart_series_selection_changed()");
  chart_update();
}

// eslint-disable-next-line no-unused-vars
function action_download_data_csv() {
  console.log("fnc action_download_data_csv()");
  let csvContent = "data:text/csv;charset=utf-8," + "Date\tItems\tItems/Min\n";
  data.forEach(function (row) {
    csvContent +=
      timestamp_to_datestr(row["timestamp"]) + "\t" + row["items"] + "\t";
    if ("items_per_min" in row) {
      csvContent += row["items_per_min"] + "\n";
    } else {
      csvContent += "\n";
    }
  });
  html_a_download_csv.setAttribute("href", encodeURI(csvContent));
  html_a_download_csv.setAttribute("download", "eta.csv");
  html_a_download_csv.click();
}

// eslint-disable-next-line no-unused-vars
function action_download_data_json() {
  console.log("fnc action_download_data_json()");
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify([settings, data]));
  html_a_download_csv.setAttribute("href", dataStr);
  html_a_download_csv.setAttribute("download", "eta.json");
  html_a_download_csv.click();
}

// eslint-disable-next-line no-unused-vars
function action_upload_data_json(input) {
  console.log("fnc action_upload_data_json()");
  // from https://javascript.info/file
  const file = input.files[0];
  const reader = new FileReader();
  reader.readAsText(file);
  reader.onload = function () {
    const uploaded_data = JSON.parse(reader.result);
    // console.log(uploaded_data);
    settings = uploaded_data[0];
    data = uploaded_data[1];
    window.localStorage.setItem("eta_settings", JSON.stringify(settings));
    window.localStorage.setItem("eta_data", JSON.stringify(data));
    html_input_target.value = settings["target"];
    update_displays();
  };
  reader.onerror = function () {
    console.log(reader.error);
  };
}

// eslint-disable-next-line no-unused-vars
function action_hide_intro() {
  console.log("fnc action_hide_intro()");
  // from https://stackoverflow.com/questions/1070760/javascript-href-vs-onclick-for-callback-function-on-hyperlink
  const html_text_intro = document.getElementById("text_intro");
  html_text_intro.remove();
}

function action_add_hist() {
  console.log("fnc action_add_hist()");
  if (!("target" in settings)) {
    alert("set target first");
    return;
  }
  const datetime_str = html_input_hist_datetime.value;
  if (!datetime_str) {
    alert("invalid date / time");
    return;
  }
  if (html_input_hist_items.value === "") {
    alert("items missing");
    return;
  }
  const items = Number(html_input_hist_items.value.replace(",", "."));
  const row_new = {
    timestamp: Date.parse(datetime_str),
    items: items,
    remaining: calc_remaining_items(items, settings["target"]),
  };
  data.push(row_new);
  data = sort_data(data);
  update_displays();
  html_input_hist_items.value = "";
}

// initialize

// wait for tableBuilt event and update all data displays afterwards
table.on("tableBuilt", function () {
  update_displays();
});

// auto-refresh of remaining time
let interval_auto_refresh;
// = setInterval(update_remaining_time, 1000);
// done in calc_total_eta_and_speed()

// hist_datetime to now
html_input_hist_datetime.value = new Date().toISOString().substring(0, 16);

// Test area

// console.log(
//     Date()
// );
