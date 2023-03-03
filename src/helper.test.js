/* eslint-disable require-jsdoc */
/* eslint-disable camelcase */

/* from https://marioyepes.com/jest-setup-vanilla-javascript-project/
and
https://daily-dev-tips.com/posts/adding-jest-test-to-a-project/

npm install --save-dev jest jest-environment-jsdom
package.json: set
"scripts": {"test": "jest --coverage"},
"jest": { "testEnvironment": "jsdom" }
npm test

jsdom provides window.localStorage
*/

// importing the functions to test

// this:
// import remaining_seconds_to_readable_time from "./helper.js";
// throws SyntaxError: Cannot use import statement outside a module
// so using require instead

describe("Testing zeroPad", () => {
  const { zeroPad } = require("./helper");
  test("1->01", () => {
    expect(zeroPad(1, 2)).toEqual("01");
  });
});

describe("Testing remaining_seconds_to_readable_time()", () => {
  const { rel_seconds_to_readable_time } = require("./helper");
  test("1s", () => {
    expect(rel_seconds_to_readable_time(1)).toEqual("1s");
  });
  test("100s", () => {
    expect(rel_seconds_to_readable_time(100)).toEqual("1:40min");
  });
  test("0s", () => {
    expect(rel_seconds_to_readable_time(0)).toEqual("0s");
  });
  test("-1s", () => {
    expect(rel_seconds_to_readable_time(-1)).toEqual("0s");
  });
  test(">1h", () => {
    expect(rel_seconds_to_readable_time(4000)).toEqual("1:07h");
  });
  test(">1d", () => {
    expect(rel_seconds_to_readable_time(100000)).toEqual("1d 4h");
  });
});

describe("Testing calc_speed_in_unit()", () => {
  const { calc_speed_in_unit } = require("./helper");
  test("Minute", () => {
    expect(calc_speed_in_unit(1234.567, "Minute")).toEqual(1234.6);
  });
  test("Hour", () => {
    expect(calc_speed_in_unit(0.1, "Hour")).toEqual(6.0);
  });
  test("Day", () => {
    expect(calc_speed_in_unit(0.1, "Day")).toEqual(144.0);
  });
});

describe("Testing timestamp_to_datestr()", () => {
  const { timestamp_to_datestr } = require("./helper");
  test("Minute", () => {
    expect(timestamp_to_datestr(1677320618262)).toEqual("25.2.2023 11:23:38");
  });
});

describe("Testing calc_remaining_items()", () => {
  const { calc_remaining_items } = require("./helper");
  test("target=0", () => {
    expect(calc_remaining_items(30, 0)).toEqual(30);
  });
  test("target>0", () => {
    expect(calc_remaining_items(30, 100)).toEqual(70);
  });
});

describe("isNumeric()", () => {
  // from https://dev.to/bgord/simplify-repetitive-jest-test-cases-with-test-each-310m
  const cases = [
    ["10", true],
    ["asdf", false],
    ["1.1", true],
    ["1,1", false],
    ["10x", false],
    [" 10 ", true], // this is surprising
  ];
  const { isNumeric } = require("./helper");
  test.each(cases)(
    "given '%p' as argument, returns %p",
    (firstArg, expectedResult) => {
      const result = isNumeric(firstArg);
      expect(result).toEqual(expectedResult);
    }
  );
});

describe("Testing linreg()", () => {
  const { linreg } = require("./helper");
  const x = [
    1677464718648, 1677464720558, 1677464721845, 1677464723069, 1677464724581,
    1677464725877, 1677464727326, 1677464728429, 1677464729925, 1677465568115,
  ];
  const y = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
  test("test 1", () => {
    expect(linreg(x, y)).toEqual([-0.00000605439111290888, 10156032.530841943]);
  });
});

describe("Testing calc_row_new_delta()", () => {
  const { calc_row_new_delta } = require("./helper");
  const row_last = { items: 1, remaining: 9, timestamp: 1677554357951 };
  const row_new = { items: 2, remaining: 8, timestamp: 1677554364952 };
  test("test 1", () => {
    expect(calc_row_new_delta(row_new, row_last)).toEqual({
      items: 2,
      remaining: 8,
      timestamp: 1677554364952,
      eta_str: "28.2.2023 04:20:20",
      eta_ts: 1677554420960,
      items_per_min: 8.570204256534781,
    });
  });
});

describe("Testing sort_data()", () => {
  const { sort_data } = require("./helper");
  data = [
    {
      timestamp: 1677554364952,
      items: 2,
      remaining: 8,
      items_per_min: 8.570204256534781,
      eta_ts: 1677554420960,
      eta_str: "28.2.2023 04:20:20",
    },
    {
      timestamp: 1677554357951,
      items: 1,
      remaining: 9,
    },
  ];
  test("test 1", () => {
    expect(sort_data(data)).toEqual([
      {
        timestamp: 1677554357951,
        items: 1,
        remaining: 9,
      },
      {
        timestamp: 1677554364952,
        items: 2,
        remaining: 8,
        items_per_min: 8.570204256534781,
        eta_ts: 1677554420960,
        eta_str: "28.2.2023 04:20:20",
      },
    ]);
  });
});
