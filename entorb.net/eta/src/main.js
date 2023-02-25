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

TODO/IDEAS
100% test coverage for helper.js
chart: choose to display remaining instead of items
*/

// html elements
const html_input_items = document.getElementById("input_items");
const html_input_target = document.getElementById("input_target");
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
  if (data.length === 0) {
    html_input_items.value = 1;
  } else {
    const last_row = data.slice(-1)[0];
    html_input_items.value = last_row["items"];
  }
  const localStorageSettings = window.localStorage.getItem("eta_settings");
  if (localStorageSettings) {
    settings = JSON.parse(localStorageSettings);
    html_input_target.value = settings["target"];
  } else {
    settings = {};
    html_input_target.value = 0;
  }
}

// Table

const table = new Tabulator("#div_table", {
  height: "100%",
  // data: data,
  layout: "fitDataStretch", // fit columns to width of table (optional)
  selectable: true,
  columns: [
    {
      title: "Date",
      field: "date_str",
      sorter: "datetime",
      headerSort: false,
      hozAlign: "center",
    }, // datetime sorting requires luxon.js library
    { title: "Items", field: "items", headerSort: false, hozAlign: "center" },
    {
      title: "Remaining",
      field: "remaining",
      headerSort: false,
      hozAlign: "center",
    },
    { title: "Speed", field: "speed", headerSort: false, hozAlign: "center" },
    { title: "ETA", field: "eta_str", headerSort: false, hozAlign: "left" },
  ],
});

function table_update() {
  console.log("table_update()");
  // IDEA: second function for just adding a row instead of recreating the table each time?
  const data_table = [];
  // BUG: this is only updated when the second time called
  table.updateColumnDefinition("speed", {
    title: "Items/" + total_speed_time_unit,
  });

  for (let i = 0; i < data.length; i++) {
    // bad: const row = data[i];
    // clone / copy the origial row
    // from https://www.samanthaming.com/tidbits/70-3-ways-to-clone-objects/
    const row = Object.assign({}, data[i]);
    row["remaining"] = Math.abs(row["remaining"]);
    row["date_str"] = timestamp_to_datestr(row["timestamp"]);
    if ("items_per_min" in row) {
      row["speed"] = calc_speed_in_unit(
        row["items_per_min"],
        total_speed_time_unit
      );
    }
    data_table.push(row);
  }
  table.setData(data_table);
}

// eslint-disable-next-line no-unused-vars
function table_delete_rows() {
  console.log("table_delete_rows()");
  // const selectedRows = table.getSelectedRows();
  const selectedData = table.getSelectedData();
  if (selectedData.length === data.length) {
    // delete all via reset()
    reset();
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
  sort_data(data);
  update_displays();
}

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
  console.log("chart_update()");
  const chart_colors = ["#3ba272", "#5470c6", "#91cc75"];
  const data_echart_items = [];
  const data_echart_speed = [];
  const data_echart_eta = [];
  const mode = html_sel_chart_y2.value;

  for (let i = 0; i < data.length; i++) {
    // clone, see update_table
    const row = Object.assign({}, data[i]);
    data_echart_items.push([new Date(row["timestamp"]), row["items"]]);
    if ("items_per_min" in row) {
      data_echart_speed.push([
        new Date(row["timestamp"]),
        calc_speed_in_unit(row["items_per_min"], total_speed_time_unit),
      ]);
    }
    if ("items_per_min" in row) {
      data_echart_eta.push([
        new Date(row["timestamp"]),
        new Date(row["eta_ts"]),
      ]);
    }
  }

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
      data: data_echart_items,
      color: chart_colors[0],
      areaStyle: { opacity: 0.5 },
    },
  };

  const series_speed = {
    ...series_common,
    ...{
      yAxisIndex: 1,
      color: chart_colors[1],
      data: data_echart_speed,
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
      data: data_echart_eta,
      markLine: {
        symbol: "none",
        label: { show: false },
        silent: true,
        animation: true,
        data: [{ yAxis: new Date(total_timestamp_eta) }],
      },
    },
  };

  if (mode === "speed") {
    chart.setOption({
      series: [series_items, series_speed],
      xAxis: { type: "time" },
      yAxis: [yAxis_items, yAxis2_speed],
    });
  } else if (mode === "eta") {
    chart.setOption({
      series: [series_items, series_eta],
      xAxis: { type: "time" },
      yAxis: [yAxis_items, yAxis2_eta],
    });
  }
}

// update functions

function update_total_eta_and_speed() {
  console.log("update_total_eta_and_speed()");
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
  // target > 0: slope of remaining items is negative
  // target = 0: slope of remaining items is positive (but remaining items is neg as well)
  // last_row["remaining"] / slope is positive for both modes

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

  // re-initalize the auto-refresh timer
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
  console.log("update_timers()");
  if (data.length === 0) {
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
  console.log("update_start_and_pct()");
  if (data.length === 0) {
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
  console.log("update_displays()");
  if (data.length > 0) {
    update_start_and_pct();
    table_update();
    if (data.length >= 2) {
      update_total_eta_and_speed();
      chart_update();
    }
  }
}

// FE EventListener

html_input_target.addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    setTarget();
  }
});
html_input_items.addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    add();
  }
});
html_input_hist_items.addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    add_hist();
  }
});

// FE-triggered functions

function setTarget() {
  console.log("setTarget()");
  let target_new;
  if (!html_input_target.value) {
    target_new = 0;
    html_input_target.value = 0;
  } else {
    target_new = Number(html_input_target.value);
  }

  if (target_new < 0) {
    console.log("new target negativ");
    alert("Target must be positiv.");
    return; // new target is neg
  }
  if (target_new === settings["target"]) {
    console.log("target unchanged");
    return; // nothing to change
  }
  if (data.length > 0) {
    console.log("data already present");
    alert(
      "In order to change the target, delete the data first, see button below."
    );
    html_input_target.value = settings["target"];
    return;
  } else {
    console.log("target changed to " + target_new);
    settings["target"] = target_new;
    window.localStorage.setItem("eta_settings", JSON.stringify(settings));

    if (settings["target"] === 0) {
      table.hideColumn("remaining");
    } else {
      table.showColumn("remaining");
    }
    // console.log(settings);
  }
}

function add() {
  console.log("add()");
  if ("target" in settings) {
    // console.log("target: " + settings);
  } else {
    console.log("setting target prio to add items value");
    setTarget();
  }
  if (!html_input_items.value) {
    console.log("items empty");
    return;
  }
  const d = new Date();
  const items = Number(html_input_items.value);
  const target = settings["target"];
  const timestamp = d.getTime();
  const row_new = {
    timestamp: timestamp,
    items: items,
    remaining: target - items,
  };
  // data already present before we add the new row
  if (data.length >= 1) {
    const row_last = data.slice(-1)[0];

    // in mode=countdown, we only exept decreasing values
    if (target === 0 && items >= row_last["items"]) {
      alert("New entry must be < previous entry in countdown mode.");
      return;
    }
    // in mode=countup, we only exept increasing values
    if (target > 0 && items <= row_last["items"]) {
      alert("New entry must be > previous entry in countup mode.");
      return;
    }
    // in mode=countup, we do not exept values > target
    if (target > 0 && items > target) {
      alert("New entry must not exceed target.");
      return;
    }
    calc_row_new_items_per_min_and_eta(row_new, row_last);
  }

  data.push(row_new);
  window.localStorage.setItem("eta_data", JSON.stringify(data));
  update_displays();
}

function reset() {
  console.log("reset()");
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
  table_update();
  chart_update();
}

// eslint-disable-next-line no-unused-vars
function download_data_csv() {
  console.log("download_data_csv()");
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
function download_data_json() {
  console.log("download_data_json()");
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify([settings, data]));
  html_a_download_csv.setAttribute("href", dataStr);
  html_a_download_csv.setAttribute("download", "eta.json");
  html_a_download_csv.click();
}

// eslint-disable-next-line no-unused-vars
function upload_data_json(input) {
  console.log("upload_data_json()");
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
function hide_intro() {
  console.log("hide_intro()");
  // from https://stackoverflow.com/questions/1070760/javascript-href-vs-onclick-for-callback-function-on-hyperlink
  const html_text_intro = document.getElementById("text_intro");
  html_text_intro.remove();
}

function add_hist() {
  console.log("add_hist()");
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
  const items = Number(html_input_hist_items.value);
  const row_new = {
    timestamp: Date.parse(datetime_str),
    items: items,
    remaining: settings["target"] - items,
  };
  data.push(row_new);
  sort_data(data);
  update_displays();
}

// initalize

// wait for tableBuilt event and update all data displays afterwards
table.on("tableBuilt", function () {
  update_displays();
});

// autorefresh of remaining time
let interval_auto_refresh;
// = setInterval(update_remaining_time, 1000);
// done in calc_total_eta_and_speed()

if (data.length >= 1) {
  update_total_eta_and_speed();
}

// hist_datetime to now
html_input_hist_datetime.value = new Date().toISOString().substring(0, 16);

// Test area

// console.log(
//     Date()
// );
