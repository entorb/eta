/*
DONE
if mode = countdown -> items < last_items
if mode = target -> items > last_items
wget script for download libs
store/move targed to eta_settings
add modes: decrease to 0 / increase to target
reset should delete eta_settings as well
download data and upload data

TODO/IDEAS
chart: add linreg-slope (items per min)
chart: select what to plot: items/min, items, ETA
*/


// html elements
const html_input_items = document.getElementById("input_items");
const html_input_target = document.getElementById("input_target");
const html_div_chart = document.getElementById('div_chart');
const html_text_eta = document.getElementById("text_eta");
const html_text_remaining = document.getElementById("text_remaining");
const html_text_items_p_min = document.getElementById("text_items_p_min");
const html_text_start = document.getElementById("text_start");
const html_text_runtime = document.getElementById("text_runtime");
const html_text_pct = document.getElementById("text_pct");

// read browsers local storage for last session data
let data;
localStorageData = window.localStorage.getItem("eta_data");
if (localStorageData) {
    data = JSON.parse(localStorageData);
} else {
    data = [];
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


// setup table
let table = new Tabulator("#div_table", {
    height: "100%",
    data: data,
    layout: "fitDataStretch", //fit columns to width of table (optional)
    selectable: false,
    columns: [
        { title: "Date", field: "date_str", sorter: "datetime", headerSort: false, hozAlign: "center" }, // datetime sorting requires luxon.js library
        { title: "Items", field: "items", headerSort: false, hozAlign: "center" },
        { title: "Remaining", field: "remaining", headerSort: false, hozAlign: "center" },
        { title: "Items per Min", field: "items_per_min_round", headerSort: false, hozAlign: "center" },
        { title: "ETA", field: "eta", headerSort: false, hozAlign: "left" },
    ],
});

function update_table() {
    table.setData(data);
}


// setup chart
let chart = echarts.init(html_div_chart);

chart.setOption(
    {
        title: {
            text: 'Items per Minute'
        },
        tooltip: {},
        legend: {},
        xAxis: {
            type: 'time',
        },
        yAxis: {
            type: 'value',
        },
        grid: {
            // define margins
            containLabel: false,
            left: 50,
            bottom: 20,
            top: 30,
            right: 10,
        },
    },
);

function update_chart() {
    let data_echart = [];
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (row["items_per_min"]) {
            data_echart.push(
                [row["datetime"], Math.abs(row["items_per_min"])]
            )
        }
    }

    chart.setOption({
        series:
            [{
                type: 'line',
                data: data_echart,
                smooth: true,
                symbolSize: 10,
                // markLine: {
                //     symbol: 'none',
                //     silent: true,
                //     animation: false,
                //     lineStyle: {
                //         color: "#0000ff"
                //         //type: 'solid'
                //     },
                //     data: [
                //         {
                //             yAxis: 12,
                //         },
                //         {
                //             yAxis: -12,
                //         },
                //     ]
                // }
            },
            ]
    });
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

function toHoursAndMinutes(totalSeconds) {
    // from https://codingbeautydev.com/blog/javascript-convert-seconds-to-hours-and-minutes/
    const totalMinutes = Math.floor(totalSeconds / 60);
    const seconds = Math.ceil(totalSeconds % 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return zeroPad(hours, 2) + ":" + zeroPad(minutes, 2) + ":" + zeroPad(seconds, 2);
}

function calc_eta_from_all_data() {
    let xArray = [];
    let yArray = [];
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (row["remaining"]) {
            xArray.push(row["timestamp"]);
            yArray.push(row["remaining"]);
        }
    }
    const [slope, intercept] = linreg(xArray, yArray);
    const last_row = data.slice(-1)[0];

    // V1: eta via slope and intercept
    //  might result in eta<now
    // ts_eta = -intercept / slope;
    // if (last_row["timestamp"] > ts_eta) {
    //     ts_eta = last_row["timestamp"] + 1;
    //     console.log("last > eta");
    //     console.log([last_row["timestamp"], ts_eta]);
    // }
    // ensure that the eta is not smaller than the latest entry

    // V2: eta via slope (= items per sec) and remaining items
    const ts_eta = last_row["timestamp"] + (-1 * last_row["remaining"] / slope);

    const d = new Date(ts_eta * 1000);

    html_text_eta.innerHTML = d.toLocaleString('de-DE');
    html_text_remaining.innerHTML = "<b>" + (new Date(ts_eta * 1000 - Date.now()).toISOString().substring(11, 19)) + "</b>";
    html_text_items_p_min.innerHTML = (Math.round(10 * Math.abs(slope) * 60) / 10);
}

function calc_start_and_runtime() {
    const ts_first = data[0]["timestamp"];
    const ts_start = ts_first;

    // idea: calc start if target > 0 and start(items) = 0
    // var xArray = [];
    // var yArray = [];
    // for (var i = 0; i < my_data.length; i++) {
    //     var row = my_data[i];
    //     xArray.push(row["timestamp"]);
    //     yArray.push(row["items"]);
    // }
    // [slope, intercept] = linreg_v2(xArray, yArray);

    // ts_start = -intercept / slope;
    // // ensure that the eta is not smaller than the latest entry
    // ts_first = my_data[0]["timestamp"];

    // if (ts_start > ts_first) {
    //     ts_start = ts_first - 1;
    //     console.log("first < start");
    //     console.log([ts_first, ts_start]);
    // }

    const d = new Date(ts_start * 1000);
    html_text_start.innerHTML = d.toLocaleString('de-DE');
    html_text_runtime.innerHTML = toHoursAndMinutes(Date.now() / 1000 - ts_start);
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
    let target_new;
    if (!html_input_target.value) {
        target_new = 0;
        html_input_target.value = 0;
    } else {
        target_new = Number(html_input_target.value);
    }

    if (target_new == settings["target"]) {
        console.log("target unchanged");
        return; // nothing to change
    }
    if (data.length > 0) {
        console.log("data already present");
        alert("In order to change the target, delete the data first");
        html_input_target.value = settings["target"];
        return;
    }
    else {
        console.log("target changed to " + target_new);
        settings["target"] = target_new;
        window.localStorage.setItem("eta_settings", JSON.stringify(settings));
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
    const d = new Date();
    const items = Number(html_input_items.value);
    const target = settings["target"];
    const timestamp = d.getTime() / 1000;
    if (!items | items == 0) {
        return;
    }
    let row_new = {
        "datetime": d,
        "items": items,
        "remaining": target - items,
        "date_str": d.toLocaleString('de-DE'),
        "timestamp": timestamp,

    }
    if (data.length > 0) {
        const row_last = data.slice(-1)[0];

        // in mode=countdown, we only exept decreasing values
        if (target == 0 && items >= row_last["items"]) {
            return;
        }
        // in mode=countup, we only exept increasing values
        if (target > 0 && items <= row_last["items"]) {
            return;
        }
        // in mode=countup, we do not exept values > target
        if (target > 0 && items > target) {
            return;
        }

        if (items != row_last["items"]) {
            // calc items_per_min
            row_new["items_per_min"] = 60 * (items - row_last["items"]) / (timestamp - row_last["timestamp"]);
            row_new["items_per_min_round"] = (Math.round(10 * row_new["items_per_min"]) / 10);
            // calc eta
            const ts_eta = (
                timestamp
                + (row_new["remaining"] / row_new["items_per_min"] * 60)
            ) * 1000;
            row_new["eta"] = (new Date(ts_eta)).toLocaleString('de-DE');
        }
    }
    data.push(row_new);
    window.localStorage.setItem("eta_data", JSON.stringify(data));
    // console.log(new_row);
    update_table();
    update_chart();

    if (data.length > 1) {
        const row_first = data[0];
        const row_last = data.slice(-1)[0];
        calc_eta_from_all_data();
        calc_start_and_runtime();

        // update text_pct
        let percent;
        if (target == 0) {
            percent = (Math.round(10 * (100 - 100 * row_last["remaining"] / row_first["remaining"]))) / 10;
        }
        else if (target > 0) {
            percent = (Math.round(10 * (100 - 100 * row_last["remaining"] / (row_first["items"] + row_first["remaining"])))) / 10;
        }
        html_text_pct.innerHTML = percent + "%";
    }
}

function reset() {
    data = [];
    settings = {};
    // window.localStorage.setItem("eta_data", JSON.stringify(data));
    window.localStorage.removeItem('eta_data');
    window.localStorage.removeItem('eta_settings');
    html_text_eta.innerHTML = "&nbsp;";
    html_text_remaining.innerHTML = "&nbsp;";
    html_text_start.innerHTML = "&nbsp;";
    html_text_runtime.innerHTML = "&nbsp;";
    html_text_pct.innerHTML = "&nbsp;";
    html_text_items_p_min.innerHTML = "&nbsp;";
    update_table();
    update_chart();
}


// initalize
if (data.length > 1) {
    update_chart();
    calc_start_and_runtime();
}
if (data.length > 2) {
    calc_eta_from_all_data();
}

// Test area
// download data
function download_data() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify([settings, data]));
    let html_dl_anchor = document.getElementById("downloadAnchor");
    html_dl_anchor.setAttribute("href", dataStr);
    html_dl_anchor.setAttribute("download", "eta.json");
    html_dl_anchor.click();
}

// upload data
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
        update_table();
        update_chart();
    };
    reader.onerror = function () {
        console.log(reader.error);
    };

}

// console.log(
//     Date()
// );

