// read browsers local storage for last session data
localStorageData = window.localStorage.getItem("my_data");
if (localStorageData) {
    var my_data = JSON.parse(localStorageData);
} else {
    var my_data = [];
}
localStorageData = window.localStorage.getItem("my_settings");
if (localStorageData) {
    var my_settings = JSON.parse(localStorageData);
} else {
    var my_settings = {};
}


/*
DONE
if mode = countdown -> items < last_items

TODO
info texts
wget script for download libs
store/move targed to my_settings
add modes: decrease to 0 / increase to target
if mode = target -> items > last_items
chart: add linreg-slope (items per min)
*/




// setup table
var table = new Tabulator("#div_table", {
    height: "100%",
    data: my_data,
    layout: "fitDataStretch", //fit columns to width of table (optional)
    selectable: false,
    columns: [
        { title: "Date", field: "date_str", sorter: "datetime", headerSort: false, hozAlign: "center" }, // datetime sorting requires luxon.js library
        { title: "Items", field: "items", headerSort: false, hozAlign: "center" },
        { title: "Remaining", field: "remaining", headerSort: false, hozAlign: "center" },
        { title: "Items per Min", field: "items_per_min", headerSort: false, hozAlign: "center" },
        { title: "ETA", field: "eta", headerSort: false, hozAlign: "left" },
    ],
});

function update_table() {
    table.setData(my_data);
}


// setup chart
var chart = echarts.init(document.getElementById('div_chart'));


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
    var my_data_eCharts = [];
    for (var i = 0; i < my_data.length; i++) {
        var row = my_data[i];
        if (row["items_per_min"]) {
            my_data_eCharts.push(
                [row["datetime"], Math.abs(row["items_per_min"])]
            )
        }
    }

    chart.setOption({
        series:
            [{
                type: 'line',
                data: my_data_eCharts,
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
//     // from Lin Reg, see https://www.w3schools.com/ai/ai_regressions.asp
//     // bad, since using average instead of least squares
//     // y=slope*x+intercept
//     // Calculate Sums
//     var xSum = 0, ySum = 0, xxSum = 0, xySum = 0;
//     var count = xArray.length;
//     for (var i = 0, len = count; i < count; i++) {
//         xSum += xArray[i];
//         ySum += yArray[i];
//         xxSum += xArray[i] * xArray[i];
//         xySum += xArray[i] * yArray[i];
//     }

//     // Calculate slope and intercept
//     var slope = (count * xySum - xSum * ySum) / (count * xxSum - xSum * xSum);
//     var intercept = (ySum / count) - (slope * xSum) / count;
//     if (intercept > 10000) {
//         console.log("m,b");
//         console.log([slope, intercept]);
//     }

//     return [slope, intercept];
// }


function linreg_v2(x, y) {
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
    const totalMinutes = Math.floor(totalSeconds / 60);
    const seconds = Math.ceil(totalSeconds % 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return zeroPad(hours, 2) + ":" + zeroPad(minutes, 2) + ":" + zeroPad(seconds, 2);
}

function calc_eta_from_all_data() {
    var xArray = [];
    var yArray = [];
    for (var i = 0; i < my_data.length; i++) {
        var row = my_data[i];
        if (row["remaining"]) {
            xArray.push(row["timestamp"]);
            yArray.push(row["remaining"]);
        }
    }
    [slope, intercept] = linreg_v2(xArray, yArray);
    last_row = my_data.slice(-1)[0];

    // ts_eta = -intercept / slope;
    // if (last_row["timestamp"] > ts_eta) {
    //     ts_eta = last_row["timestamp"] + 1;
    //     console.log("last > eta");
    //     console.log([last_row["timestamp"], ts_eta]);
    // }
    // ensure that the eta is not smaller than the latest entry

    // V2: eta via slope (= items per sec) and remaining items
    ts_eta = last_row["timestamp"] + (-1 * last_row["remaining"] / slope);

    d = new Date(ts_eta * 1000);

    document.getElementById("text_eta").innerHTML = d.toLocaleString('de-DE');
    document.getElementById("text_remaining").innerHTML = "<b>" + (new Date(ts_eta * 1000 - Date.now()).toISOString().substring(11, 19)) + "</b>";
    document.getElementById("text_items_p_min").innerHTML = (Math.round(10 * Math.abs(slope) * 60) / 10);
}


function calc_start_and_runtime() {
    ts_first = my_data[0]["timestamp"];
    ts_start = ts_first;

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


    d = new Date(ts_start * 1000);

    document.getElementById("text_start").innerHTML = d.toLocaleString('de-DE');
    document.getElementById("text_runtime").innerHTML = toHoursAndMinutes(Date.now() / 1000 - ts_start);
}


// Button-triggered functions

var input_items = document.getElementById("input_items");
input_items.addEventListener("keypress", function (event) {
    console.log("123");
    if (event.key === "Enter") {
        event.preventDefault();
        add();
    }
});

function add() {
    d = new Date();
    items = Number(document.getElementById("input_items").value);
    target = Number(document.getElementById("input_target").value);
    timestamp = d.getTime() / 1000;
    if (!items | items == 0) {
        return;
    }
    new_row = {
        "datetime": d,
        "items": items,
        "remaining": target - items,
        "date_str": d.toLocaleString('de-DE'),
        "timestamp": timestamp,

    }
    if (my_data.length > 0) {
        last_row = my_data.slice(-1)[0];

        // in mode=countdown, we only exept decreasing values
        if (target == 0 && items >= last_row["items"]) {
            return;
        }
        // in mode=countup, we only exept increasing values
        if (target > 0 && items <= last_row["items"]) {
            return;
        }
        // in mode=countup, we do not exept values > target
        if (target > 0 && items > target) {
            return;
        }

        if (items != last_row["items"]) {
            // calc items_per_min
            new_row["items_per_min"] = (Math.round(10 * 60 * (items - last_row["items"]) / (timestamp - last_row["timestamp"])) / 10);
            // calc eta
            ts_eta = (
                timestamp
                + (new_row["remaining"] / new_row["items_per_min"] * 60)
            ) * 1000;
            new_row["eta"] = (new Date(ts_eta)).toLocaleString('de-DE');
        }
    }
    my_data.push(new_row);
    window.localStorage.setItem("my_data", JSON.stringify(my_data));
    // console.log(new_row);
    update_table();
    update_chart();

    if (my_data.length > 1) {
        calc_eta_from_all_data();
        calc_start_and_runtime();

        // update text_pct
        first_row = my_data[0];
        last_row = my_data.slice(-1)[0];
        if (target == 0) {
            percent = (Math.round(10 * (100 - 100 * last_row["remaining"] / first_row["remaining"]))) / 10;
        }
        else if (target > 0) {
            percent = (Math.round(10 * (100 - 100 * last_row["remaining"] / (first_row["items"] + first_row["remaining"])))) / 10;
        }
        document.getElementById("text_pct").innerHTML = percent + "%";

        // if (target > 0 && items < target) {
        //     ;
        // }
        // else {
        //     console.log([target, items]);
        // }
    }

}


function reset() {
    my_data = [];
    window.localStorage.setItem("my_data", JSON.stringify(my_data));
    document.getElementById("text_eta").innerHTML = "&nbsp;";
    document.getElementById("text_remaining").innerHTML = "&nbsp;";
    document.getElementById("text_start").innerHTML = "&nbsp;";
    document.getElementById("text_runtime").innerHTML = "&nbsp;";
    document.getElementById("text_pct").innerHTML = "&nbsp;";
    document.getElementById("text_items_p_min").innerHTML = "&nbsp;";
    update_table();
    update_chart();
}



// initalize

if (document.getElementById("input_target").value == "") {
    document.getElementById("input_target").value = 0;
}

if (my_data.length > 1) {
    update_chart();
    calc_start_and_runtime();
}

if (my_data.length > 2) {
    calc_eta_from_all_data();
}



// console.log(
//     Date()
// );

