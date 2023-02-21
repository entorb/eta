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

TODO/IDEAS
chart: select what to plot: items/min, items, ETA
table: remove rows (and recalc the speed afterwards)
speed unit auto: per min / per hour / per day
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

let speed_map_unit_factor = {
    "Items/min": 1,
    "Items/hour": 60,
    "Items/day": 1440, // 60*24
}


// setup table
let table = new Tabulator("#div_table", {
    height: "100%",
    // data: data,
    layout: "fitDataStretch", //fit columns to width of table (optional)
    selectable: false,
    columns: [
        { title: "Date", field: "date_str", sorter: "datetime", headerSort: false, hozAlign: "center" }, // datetime sorting requires luxon.js library
        { title: "Items", field: "items", headerSort: false, hozAlign: "center" },
        { title: "Remaining", field: "remaining", headerSort: false, hozAlign: "center" },
        { title: "Items per min", field: "items_per_min", headerSort: false, hozAlign: "center" },
        { title: "ETA", field: "eta_str", headerSort: false, hozAlign: "left" },
    ],
});

function update_table() {
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

function update_chart(speed) {
    let data_echart = [];
    for (let i = 0; i < data.length; i++) {
        // clone, see update_table
        const row = Object.assign({}, data[i]);
        if (row["items_per_min"]) {
            data_echart.push(
                [new Date(row["timestamp"]), Math.abs(row["items_per_min"])]
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
                markLine: {
                    symbol: 'none',
                    label: { show: false },
                    silent: true,
                    animation: false,
                    lineStyle: {
                        color: "#0000ff"
                        //type: 'solid'
                    },
                    data: [
                        {
                            yAxis: speed,
                        },
                    ]
                }
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

function calc_eta_speed() {
    let xArray = [];
    let yArray = [];
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        xArray.push(row["timestamp"]);
        yArray.push(row["remaining"]);
    }
    const [slope, intercept] = linreg(xArray, yArray);
    // slope = speed in items/ms
    // slope of remaining items is negative

    // V1: eta via slope and intercept
    //  might result in eta < now
    // ts_eta = -intercept / slope;

    // V2: eta via slope (= items per sec) and remaining items
    const last_row = data.slice(-1)[0];
    const ts_eta = last_row["timestamp"] + (-1 * last_row["remaining"] / slope);
    const items_per_min = Math.abs(slope) * 60000;

    const d = new Date(ts_eta);

    html_text_eta.innerHTML = d.toLocaleString('de-DE');
    html_text_remaining.innerHTML = "<b>" + (new Date(ts_eta - Date.now()).toISOString().substring(11, 19)) + "</b>";
    html_text_speed.innerHTML = (Math.round(10 * items_per_min) / 10);
    return [ts_eta, items_per_min];
}

function calc_start_runtime_pct() {
    const ts_first = data[0]["timestamp"];
    // const ts_start = ts_first;

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

    const d = new Date(ts_first);
    html_text_start.innerHTML = d.toLocaleString('de-DE');
    html_text_runtime.innerHTML = toHoursAndMinutes((Date.now() - ts_first) / 1000);

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
    const timestamp = d.getTime();
    if (!items | items == 0) {
        return;
    }
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

        // calc items_per_min
        row_new["items_per_min"] = 60000 * (items - row_last["items"]) / (timestamp - row_last["timestamp"]);
        // calc eta
        const ts_eta = Math.round(
            timestamp
            + (row_new["remaining"] / row_new["items_per_min"] * 60000)
        );
        row_new["eta_str"] = (new Date(ts_eta)).toLocaleString('de-DE');
        row_new["eta_ts"] = ts_eta;
    }

    data.push(row_new);
    window.localStorage.setItem("eta_data", JSON.stringify(data));
    console.log(row_new);

    calc_start_runtime_pct();
    update_table();

    if (data.length >= 2) {
        const [ts_eta, items_per_min] = calc_eta_speed();
        update_chart(items_per_min);
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
    html_text_speed.innerHTML = "&nbsp;";
    update_table();
    update_chart(0);
}


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
        const [ts_eta, items_per_min] = calc_eta_speed();
        update_chart(items_per_min);
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


// initalize
if (data.length >= 1) {
    // wait for tableBuilt event
    table.on("tableBuilt", function () {
        update_table();
    });
    calc_start_runtime_pct();
}
if (data.length >= 2) {
    const [ts_eta, items_per_min] = calc_eta_speed();
    update_chart(items_per_min);
}


// Test area


// console.log(
    //     Date()
// );

