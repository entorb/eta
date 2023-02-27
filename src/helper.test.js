/* eslint-disable camelcase */
/* from https://marioyepes.com/jest-setup-vanilla-javascript-project/
and
https://daily-dev-tips.com/posts/adding-jest-test-to-a-project/
/*

npm install --save-dev jest
package.json: set "scripts": {"test": "jest --coverage"},
npm test
*/

// importing the functions to test

// this:
// import remaining_seconds_to_readable_time from "./helper.js";
// throws SyntaxError: Cannot use import statement outside a module
// so using require instead

const { zeroPad } = require("./helper");
describe("Testing zeroPad", () => {
  test("1->01", () => {
    expect(zeroPad(1, 2)).toEqual("01");
  });
});

const { rel_seconds_to_readable_time } = require("./helper");
describe("Testing remaining_seconds_to_readable_time()", () => {
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

const { calc_speed_in_unit } = require("./helper");
describe("Testing calc_speed_in_unit()", () => {
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

const { timestamp_to_datestr } = require("./helper");
describe("Testing timestamp_to_datestr()", () => {
  test("Minute", () => {
    expect(timestamp_to_datestr(1677320618262)).toEqual("25.2.2023 11:23:38");
  });
});

const { calc_remaining_items } = require("./helper");
describe("Testing calc_remaining_items()", () => {
  test("target=0", () => {
    expect(calc_remaining_items(30, 0)).toEqual(30);
  });
  test("target>0", () => {
    expect(calc_remaining_items(30, 100)).toEqual(70);
  });
});

const { linreg } = require("./helper");
describe("Testing linreg()", () => {
  const x = [
    1677464718648, 1677464720558, 1677464721845, 1677464723069, 1677464724581,
    1677464725877, 1677464727326, 1677464728429, 1677464729925, 1677465568115,
  ];
  const y = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
  test("target=0", () => {
    expect(linreg(x, y)).toEqual([-0.00000605439111290888, 10156032.530841943]);
  });
});
