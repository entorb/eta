/*
DONE
if mode = countdown -> items < last_items
if mode = target -> items > last_items
wget script for download libs
store/move targed to eta_settings
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

TODO/IDEAS
speed unit auto: per min / per hour / per day
runtime: dynamically update?
*/


// html elements
const html_input_items = document.getElementById("input_items");
const html_input_target = document.getElementById("input_target");
const html_div_chart = document.getElementById('div_chart');
const html_text_eta = document.getElementById("text_eta");
const html_text_remaining = document.getElementById("text_remaining");
const html_text_speed = document.getElementById("text_speed");
const html_text_start = document.getElementById("text_start");
const html_text_runtime = document.getElementById("text_runtime");
const html_text_pct = document.getElementById("text_pct");
const html_input_hist_datetime = document.getElementById("input_hist_datetime");
const html_input_hist_items = document.getElementById("input_hist_items");
const html_btn_hist_add = document.getElementById("btn_hist_add");
const html_sel_chart_y2 = document.getElementById("sel_chart_y2");

// global variables
var total_items_per_min = 0;
var total_timestamp_eta = Date.now();
var total_speed_time_unit = 'minute'; // minute/hour/day

// read browsers local storage for last session data
let data;
localStorageData = window.localStorage.getItem("eta_data");
if (localStorageData) {
    data = JSON.parse(localStorageData);
} else {
    data = [];
}
if (data.length == 0) {
    html_input_items.value = 1;
} else {
    const last_row = data.slice(-1)[0];
    html_input_items.value = last_row["items"];
}

let settings;
localStorageData = window.localStorage.getItem("eta_settings");
if (localStorageData) {
    settings = JSON.parse(localStorageData);
    html_input_target.value = settings["target"];
} else {
    settings = {};
    html_input_target.value = 0;
}

// to be used later when supporting different units of speed
// let speed_map_unit_factor = {
//     "Items/min": 1,
//     "Items/hour": 60,
//     "Items/day": 1440, // 60*24
// }


// setup table
let table = new Tabulator("#div_table", {
    height: "100%",
    // data: data,
    layout: "fitDataStretch", //fit columns to width of table (optional)
    selectable: true,
    columns: [
        { title: "Date", field: "date_str", sorter: "datetime", headerSort: false, hozAlign: "center" }, // datetime sorting requires luxon.js library
        { title: "Items", field: "items", headerSort: false, hozAlign: "center" },
        { title: "Remaining", field: "remaining", headerSort: false, hozAlign: "center" },
        { title: "Items per min", field: "items_per_min", headerSort: false, hozAlign: "center" },
        { title: "ETA", field: "eta_str", headerSort: false, hozAlign: "left" },
    ],
});

function table_update() {
    let data_table = [];
    for (let i = 0; i < data.length; i++) {
        // bad: const row = data[i];
        // clone / copy the origial row
        // from https://www.samanthaming.com/tidbits/70-3-ways-to-clone-objects/
        const row = Object.assign({}, data[i]);
        row["remaining"] = Math.abs(row["remaining"]);
        if (row["items_per_min"]) {
            row["items_per_min"] = Math.abs(Math.round(10 * row["items_per_min"]) / 10);
        }
        data_table.push(row)
    }
    table.setData(data_table);
}

function table_delete_rows() {
    // const selectedRows = table.getSelectedRows();
    const selectedData = table.getSelectedData();
    if (selectedData.length == data.length) {
        reset();
        return;
    }
    for (let i = 0; i < selectedData.length; i++) {
        const row = selectedData[i];
        const timestamp_to_delete = row["timestamp"];
        for (let j = data.length - 1; j >= 0; --j) {
            if (data[j]["timestamp"] == timestamp_to_delete) {
                data.splice(j, 1);
            }
        }
    }
    sort_data();
    update_displays();
}

// setup chart
let chart = echarts.init(html_div_chart);
//https://echarts.apache.org/en/option.html#color
// const chart_colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'];
const chart_colors = ['#3ba272', '#5470c6', '#91cc75',];
chart.setOption(
    {
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
    },
);

function chart_update() {
    let data_echart_items = [];
    let data_echart_speed = [];
    let data_echart_eta = [];
    mode = html_sel_chart_y2.value;

    for (let i = 0; i < data.length; i++) {
        // clone, see update_table
        const row = Object.assign({}, data[i]);
        data_echart_items.push(
            [new Date(row["timestamp"]), row["items"]]);
        if ("items_per_min" in row) {
            data_echart_speed.push(
                [new Date(row["timestamp"]), Math.abs(row["items_per_min"])]
            )
        }
        if ("items_per_min" in row) {
            data_echart_eta.push(
                [new Date(row["timestamp"]), new Date(row["eta_ts"])]
            )
        }
    }

    const yAxis_items = {
        name: 'Items',
        position: 'left',
        type: 'value',
        nameTextStyle: { color: chart_colors[0] },
        axisLabel: {
            textStyle: {
                color: chart_colors[0]
            }
        }
    }

    const yAxis2_common = {
        position: 'right',
        nameTextStyle: { color: chart_colors[1] },
        axisLabel: { textStyle: { color: chart_colors[1] } },
        splitLine: { show: false }, // no grid line
    };

    const yAxis2_speed = {
        ...yAxis2_common, ...{
            name: 'Speed',
            type: 'value',
        }
    }

    const yAxis2_eta = {
        ...yAxis2_common, ...{
            name: 'ETA',
            type: 'time',
        }
    }

    const series_common = {
        type: 'line',
        smooth: true,
        symbolSize: 10,
        silent: true,
        animation: false,
    }

    const series_items = {
        ...series_common, ...{
            yAxisIndex: 0,
            data: data_echart_items,
            color: chart_colors[0],
            areaStyle: { opacity: 0.5 }
        }
    };

    const series_speed = {
        ...series_common, ...{
            yAxisIndex: 1,
            color: chart_colors[1],
            data: data_echart_speed,
            markLine: {
                symbol: 'none',
                label: { show: false },
                silent: true,
                animation: true,
                data: [{ yAxis: total_items_per_min, },]
            }
        }
    };

    const series_eta = {
        ...series_common, ...{
            yAxisIndex: 1,
            color: chart_colors[1],
            data: data_echart_eta,
            markLine: {
                symbol: 'none',
                label: { show: false },
                silent: true,
                animation: true,
                data: [{ yAxis: new Date(total_timestamp_eta), },]
            }
        }
    };




    if (mode == 'speed') {
        chart.setOption({
            series: [series_items, series_speed],
            xAxis: { type: 'time', },
            yAxis: [yAxis_items, yAxis2_speed]
        });
    }
    else if (mode == 'eta') {
        chart.setOption({
            series: [series_items, series_eta],
            xAxis: { type: 'time', },
            yAxis: [yAxis_items, yAxis2_eta],
        });
    }
}


// math helpers
const zeroPad = (num, places) => String(num).padStart(places, '0')

// function linreg_v1(xArray, yArray) {
// from Lin Reg, see https://www.w3schools.com/ai/ai_regressions.asp
// bad, since using average instead of least squares

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

function remaining_seconds_to_readable_time(totalSeconds) {
    // based https://codingbeautydev.com/blog/javascript-convert-seconds-to-hours-and-minutes/
    totalSeconds = Math.floor(totalSeconds);
    if (totalSeconds < 0) {
        return "";
    } else if (totalSeconds < 60) {
        return totalSeconds.toString() + "s";
    } else if (totalSeconds < 3600) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return minutes.toString() + ":" + zeroPad(seconds, 2) + "min"
    } else if (totalSeconds < 86400) { //3600*24
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.round((totalSeconds - hours * 3600) / 60);
        return hours.toString() + ":" + zeroPad(minutes, 2) + "h"
    } else {
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.round((totalSeconds - days * 86400) / 3600);
        return days.toString() + "d " + hours.toString() + "h"
    }
}

function calc_total_eta_and_speed() {
    const last_row = data.slice(-1)[0];
    let xArray = [];
    let yArray = [];
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        xArray.push(row["timestamp"]);
        yArray.push(row["remaining"]);
    }
    const [slope, intercept] = linreg(xArray, yArray);
    // slope = speed in items/ms
    // target > 0: slope of remaining items is negative
    // target = 0: slope of remaining items is positive (but remaining items is neg as well)
    // last_row["remaining"] / slope is positive for both modes

    total_timestamp_eta = Math.round(last_row["timestamp"] + (-1 * last_row["remaining"] / slope));
    const d = new Date(total_timestamp_eta);
    html_text_eta.innerHTML = "<b>" + d.toLocaleString('de-DE') + "</b>";

    // ensure total_items_per_min to be positive 
    total_items_per_min = Math.abs(slope) * 60000;
    if (total_items_per_min > 0.5) {
        total_speed_time_unit = 'minute';
        html_text_speed.innerHTML = (Math.round(10 * total_items_per_min) / 10) + " items/min";
    } else if (total_items_per_min * 60 > 0.5) {
        total_speed_time_unit = 'hour';
        html_text_speed.innerHTML = (Math.round(10 * total_items_per_min * 60) / 10) + " items/h";
    } else {
        total_speed_time_unit = 'day';
        html_text_speed.innerHTML = (Math.round(10 * total_items_per_min * 1440) / 10) + " items/day";
    }
    update_remaining_time();
}

function update_remaining_time() {
    let ms_remaining = (total_timestamp_eta - Date.now()); // alternatively use last_row["timestamp"]
    if (ms_remaining < 0) {
        ms_remaining = 0;
        clearInterval(auto_refresh_timeinterval);
    } else {
        // re-initalize the refresh timer to 1.0s from now
        auto_refresh_timeinterval = setInterval(update_remaining_time, 1000);
        html_text_remaining.innerHTML = "<b>" + remaining_seconds_to_readable_time(ms_remaining / 1000); + "</b>";
    }
}


function calc_start_runtime_and_pct() {
    const ts_first = data[0]["timestamp"];
    const d = new Date(ts_first);
    html_text_start.innerHTML = d.toLocaleString('de-DE');
    html_text_runtime.innerHTML = remaining_seconds_to_readable_time((Date.now() - ts_first) / 1000);

    let percent;
    const row_first = data[0];
    const row_last = data.slice(-1)[0];
    if (settings["target"] == 0) {
        // remaining is neg for all rows
        percent = (Math.round(10 * (100 - 100 * row_last["remaining"] / row_first["remaining"]))) / 10;
    }
    else {
        // remaining is pos for all rows
        percent = (Math.round(10 * (100 * row_last["items"] / (row_first["items"] + row_first["remaining"])))) / 10;
    }
    html_text_pct.innerHTML = percent + "%";
}

function calc_row_new_items_per_min_and_eta(row_new, row_last) {
    // calc items_per_min
    if (row_new["timestamp"] != row_last["timestamp"]) {
        row_new["items_per_min"] = 60000 * (row_new["items"] - row_last["items"]) / (row_new["timestamp"] - row_last["timestamp"]);
    } else {
        delete row_new["items_per_min"];
    }
    // calc eta
    if ("items_per_min" in row_new && row_new["items_per_min"] != 0) {
        const ts_eta = Math.round(
            row_new["timestamp"]
            + (row_new["remaining"] / row_new["items_per_min"] * 60000)
        );
        row_new["eta_str"] = (new Date(ts_eta)).toLocaleString('de-DE');
        row_new["eta_ts"] = ts_eta;
    } else {
        delete row_new["eta_str"];
        delete row_new["eta_ts"];
    }
}

function sort_data() {
    // sorting from https://stackoverflow.com/questions/1129216/sort-array-of-objects-by-string-property-value
    // console.log(data);
    if (data.length > 1) {
        data.sort((a, b) => a.timestamp - b.timestamp);
    }
    // remove items_per_min from new first item
    if (data.length > 0) {
        delete data[0]["items_per_min"];
    }
    // re-calculate items per minute
    for (let i = 1; i < data.length; i++) {
        calc_row_new_items_per_min_and_eta(data[i], data[i - 1])
    }
    // console.log(data);
    window.localStorage.setItem("eta_data", JSON.stringify(data));
}


// FE-triggered functions
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
    if (target_new == settings["target"]) {
        console.log("target unchanged");
        return; // nothing to change
    }
    if (data.length > 0) {
        console.log("data already present");
        alert("In order to change the target, delete the data first, see button below.");
        html_input_target.value = settings["target"];
        return;
    }
    else {
        console.log("target changed to " + target_new);
        settings["target"] = target_new;
        window.localStorage.setItem("eta_settings", JSON.stringify(settings));

        if (settings["target"] == 0) {
            table.hideColumn("remaining");
        } else {
            table.showColumn("remaining");
        }
        // console.log(settings);
    }
}

function add() {
    if ("target" in settings) {
        // console.log("target: " + settings);
    } else {
        console.log("setting target prio to add items value");
        setTarget();
    }
    if (!html_input_items.value) {
        return;
    }
    const d = new Date();
    const items = Number(html_input_items.value);
    const target = settings["target"];
    const timestamp = d.getTime();
    let row_new = {
        // "datetime": d,
        "items": items,
        "remaining": target - items,
        "date_str": d.toLocaleString('de-DE'),
        "timestamp": timestamp,
    }
    // data already present before we add the new row
    if (data.length >= 1) {
        const row_last = data.slice(-1)[0];

        // in mode=countdown, we only exept decreasing values
        if (target == 0 && items >= row_last["items"]) {
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
    data = [];
    settings = {};
    total_items_per_min = 0
    // window.localStorage.setItem("eta_data", JSON.stringify(data));
    window.localStorage.removeItem('eta_data');
    window.localStorage.removeItem('eta_settings');
    html_text_eta.innerHTML = "&nbsp;";
    html_text_remaining.innerHTML = "&nbsp;";
    html_text_start.innerHTML = "&nbsp;";
    html_text_runtime.innerHTML = "&nbsp;";
    html_text_pct.innerHTML = "&nbsp;";
    html_text_speed.innerHTML = "&nbsp;";
    table_update();
    chart_update();
}

function download_data() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify([settings, data]));
    let html_dl_anchor = document.getElementById("downloadAnchor");
    html_dl_anchor.setAttribute("href", dataStr);
    html_dl_anchor.setAttribute("download", "eta.json");
    html_dl_anchor.click();
}

function upload_data(input) {
    // from https://javascript.info/file
    let file = input.files[0];
    let reader = new FileReader();
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

function hide_intro() {
    // from https://stackoverflow.com/questions/1070760/javascript-href-vs-onclick-for-callback-function-on-hyperlink
    const html_text_intro = document.getElementById('text_intro');
    html_text_intro.remove();
}

function update_displays() {
    calc_start_runtime_and_pct();
    table_update();
    if (data.length >= 2) {
        calc_total_eta_and_speed();
        chart_update();
    }
}

function add_hist() {
    if (!settings["target"]) {
        alert("set target first");
        return;
    }
    const datetime_str = html_input_hist_datetime.value;
    if (!datetime_str) {
        alert("invalid date / time");
        return;
    }
    if (html_input_hist_items.value == "") {
        alert("value missing");
        return;
    }
    const items = Number(html_input_hist_items.value);

    const timestamp = Date.parse(datetime_str);
    const d = new Date(timestamp);

    let row_new = {
        // "datetime": d,
        "items": items,
        "remaining": settings["target"] - items,
        "date_str": d.toLocaleString('de-DE'),
        "timestamp": d.getTime(),
    }
    data.push(row_new);
    sort_data();
    update_displays();
}

// initalize
// hist_datetime to now
html_input_hist_datetime.value = (new Date().toISOString().substring(0, 16));

// wait for tableBuilt event and update all data displays afterwards
table.on("tableBuilt", function () {
    update_displays();
});

// autorefresh of remaining time
let auto_refresh_timeinterval = setInterval(update_remaining_time, 1000);

// Test area



// console.log(
    //     Date()
// );

