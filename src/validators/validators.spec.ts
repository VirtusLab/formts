import * as validators from "./validators";

const str = JSON.stringify;

describe("validators", () => {
  describe("combine", () => {
    it("creates validator which returns null when all inner validators return null", () => {
      const combined = validators.combine(
        [() => null, () => null, () => null, () => null],
        it => it
      );

      expect(combined(42)).toBeNull();
    });

    it("creates validator which returns result of calling combinator fn with errors from inner validators", () => {
      const combined = validators.combine(
        [() => null, () => "E1", () => null, () => "E2"],
        errors => ({ code: "combinedErr", errors })
      );

      const result = combined(42);

      expect(result).toEqual({
        code: "combinedErr",
        errors: [null, "E1", null, "E2"],
      });
    });
  });

  describe("required", () => {
    [
      { value: null, ok: false },
      { value: undefined, ok: false },
      { value: {}, ok: true },
      { value: false, ok: false },
      { value: true, ok: true },
      { value: "", ok: false },
      { value: " ", ok: true },
      { value: "foo", ok: true },
      { value: 0, ok: true },
      { value: 42, ok: true },
      { value: new Date(), ok: true },
      { value: [], ok: true },
    ].forEach(({ value, ok }) =>
      it(`required()(${str(value)}) -> ${ok ? "OK" : "ERROR"}`, () => {
        const error = "Field is required!";
        const validator = validators.required(error);

        expect(validator(value)).toEqual(ok ? null : error);
      })
    );
  });

  describe("optional", () => {
    it("passes through non-empty values", () => {
      const validator = validators.optional();

      expect(validator("foo")).toBe(null);
      expect(validator(true)).toBe(null);
      expect(validator(0)).toBe(null);
      expect(validator({})).toBe(null);
      expect(validator([])).toBe(null);
    });

    it("throws special error to cause early return of validation for empty values", () => {
      const validator = validators.optional();

      try {
        validator("");
      } catch (err) {
        expect(err).toBe(true);
      }

      try {
        validator(null);
      } catch (err) {
        expect(err).toBe(true);
      }

      try {
        validator(false);
      } catch (err) {
        expect(err).toBe(true);
      }

      expect.assertions(3);
    });
  });

  describe("oneOf", () => {
    [
      { allowed: [], value: 42, ok: false },
      { allowed: [42], value: 42, ok: true },
      { allowed: [41, 43], value: 42, ok: false },
      { allowed: [1, "2"], value: 1, ok: true },
      { allowed: [1, "2"], value: 2, ok: false },
      { allowed: [1, "2"], value: "1", ok: false },
      { allowed: [1, "2"], value: "2", ok: true },
      { allowed: ["A", "B", "C", "D"], value: "C", ok: true },
      { allowed: ["A", "B", "C", "D"], value: "E", ok: false },
    ].forEach(({ allowed, value, ok }) =>
      it(`oneOf(${str(allowed)})(${str(value)}) -> ${
        ok ? "OK" : "ERROR"
      }`, () => {
        const error = `Value must be one of: [${allowed.join(", ")}]`;
        const validator = validators.oneOf(allowed, error);

        expect(validator(value)).toEqual(ok ? null : error);
      })
    );
  });

  describe("integer", () => {
    [
      { value: "" as const, ok: false },
      { value: 0, ok: true },
      { value: -42, ok: true },
      { value: 0.1, ok: false },
      { value: Infinity, ok: false },
      { value: NaN, ok: false },
    ].forEach(({ value, ok }) =>
      it(`integer()(${str(value)}) -> ${ok ? "OK" : "ERROR"}`, () => {
        const error = "Field must be an integer";
        const validator = validators.integer(error);

        expect(validator(value)).toEqual(ok ? null : error);
      })
    );
  });

  describe("minValue", () => {
    [
      { min: 10.5, value: "" as const, ok: false },
      { min: 10.5, value: -20, ok: false },
      { min: 10.5, value: 10.5, ok: true },
      { min: 10.5, value: 42, ok: true },
    ].forEach(({ min, value, ok }) =>
      it(`minValue(${str(min)})(${str(value)}) -> ${
        ok ? "OK" : "ERROR"
      }`, () => {
        const error = `Field must be at least ${min}`;
        const validator = validators.minValue(min, error);

        expect(validator(value)).toEqual(ok ? null : error);
      })
    );
  });

  describe("maxValue", () => {
    [
      { max: -0.5, value: "" as const, ok: false },
      { max: -0.5, value: -20, ok: true },
      { max: -0.5, value: -0.5, ok: true },
      { max: -0.5, value: 0, ok: false },
      { max: -0.5, value: 42, ok: false },
    ].forEach(({ max, value, ok }) =>
      it(`maxValue(${str(max)})(${str(value)}) -> ${
        ok ? "OK" : "ERROR"
      }`, () => {
        const error = `Field must be at most ${max}`;
        const validator = validators.maxValue(max, error);

        expect(validator(value)).toEqual(ok ? null : error);
      })
    );
  });

  describe("greaterThan", () => {
    [
      { threshold: 10.5, value: "" as const, ok: false },
      { threshold: 10.5, value: -20, ok: false },
      { threshold: 10.5, value: 10.5, ok: false },
      { threshold: 10.5, value: 10.500001, ok: true },
      { threshold: 10.5, value: 42, ok: true },
    ].forEach(({ threshold, value, ok }) =>
      it(`greaterThan(${str(threshold)})(${str(value)}) -> ${
        ok ? "OK" : "ERROR"
      }`, () => {
        const error = `Field must be greater than ${threshold}`;
        const validator = validators.greaterThan(threshold, error);

        expect(validator(value)).toEqual(ok ? null : error);
      })
    );
  });

  describe("lesserThan", () => {
    [
      { threshold: -0.5, value: "" as const, ok: false },
      { threshold: -0.5, value: -20, ok: true },
      { threshold: -0.5, value: -0.500001, ok: true },
      { threshold: -0.5, value: -0.5, ok: false },
      { threshold: -0.5, value: 0, ok: false },
      { threshold: -0.5, value: 42, ok: false },
    ].forEach(({ threshold, value, ok }) =>
      it(`lesserThan(${str(threshold)})(${str(value)}) -> ${
        ok ? "OK" : "ERROR"
      }`, () => {
        const error = `Field must be lesser than ${threshold}`;
        const validator = validators.lesserThan(threshold, error);

        expect(validator(value)).toEqual(ok ? null : error);
      })
    );
  });

  describe("pattern", () => {
    const regex = /f(o)+bar/;

    [
      { value: "", ok: false },
      { value: "foo", ok: false },
      { value: "fobar", ok: true },
      { value: "foobar", ok: true },
      { value: "ffffoooobarrr", ok: true },
    ].forEach(({ value, ok }) =>
      it(`pattern(${regex})(${str(value)}) -> ${ok ? "OK" : "ERROR"}`, () => {
        const error = "Field must much required pattern";
        const validator = validators.pattern(regex, error);

        expect(validator(value)).toEqual(ok ? null : error);
      })
    );
  });

  describe("hasUpperCaseChar", () => {
    [
      { value: "", ok: false },
      { value: "foo", ok: false },
      { value: "Foo", ok: true },
      { value: "a a A", ok: true },
      { value: "ABC", ok: true },
    ].forEach(({ value, ok }) =>
      it(`hasUpperCaseChar()(${str(value)}) -> ${ok ? "OK" : "ERROR"}`, () => {
        const error = "Field must contain at least one uppercase character";
        const validator = validators.hasUpperCaseChar(error);

        expect(validator(value)).toEqual(ok ? null : error);
      })
    );
  });

  describe("hasLowerCaseChar", () => {
    [
      { value: "", ok: false },
      { value: "FOO", ok: false },
      { value: "Foo", ok: true },
    ].forEach(({ value, ok }) =>
      it(`hasLowerCaseChar()(${str(value)}) -> ${ok ? "OK" : "ERROR"}`, () => {
        const error = "Field must contain at least one lowercase character";
        const validator = validators.hasLowerCaseChar(error);

        expect(validator(value)).toEqual(ok ? null : error);
      })
    );
  });

  describe("minLength", () => {
    [
      { min: 0, value: "", ok: true },
      { min: 0, value: [], ok: true },
      { min: 3, value: "", ok: false },
      { min: 3, value: [], ok: false },
      { min: 3, value: "foo", ok: true },
      { min: 3, value: [1, 1, 1], ok: true },
      { min: 3, value: "foobar", ok: true },
      { min: 3, value: [1, 1, 1, 1, 1], ok: true },
    ].forEach(({ min, value, ok }) =>
      it(`minLength(${min})(${str(value)}) -> ${ok ? "OK" : "ERROR"}`, () => {
        const error = `Minimum length is ${min}`;
        const validator = validators.minLength(min, error);

        expect(validator(value)).toEqual(ok ? null : error);
      })
    );
  });

  describe("maxLength", () => {
    [
      { max: 0, value: "", ok: true },
      { max: 0, value: [], ok: true },
      { max: 0, value: "a", ok: false },
      { max: 0, value: [1], ok: false },
      { max: 2, value: "", ok: true },
      { max: 2, value: [], ok: true },
      { max: 2, value: "a", ok: true },
      { max: 2, value: [1], ok: true },
      { max: 2, value: "ab", ok: true },
      { max: 2, value: [1, 2], ok: true },
      { max: 2, value: "abc", ok: false },
      { max: 2, value: [1, 2, 3], ok: false },
    ].forEach(({ max, value, ok }) =>
      it(`maxLength(${max})(${str(value)}) -> ${ok ? "OK" : "ERROR"}`, () => {
        const error = `Maximum length is ${max}`;
        const validator = validators.maxLength(max, error);

        expect(validator(value)).toEqual(ok ? null : error);
      })
    );
  });

  describe("exactLength", () => {
    [
      { expected: 0, value: "", ok: true },
      { expected: 0, value: [], ok: true },
      { expected: 0, value: "a", ok: false },
      { expected: 0, value: [1], ok: false },
      { expected: 2, value: "", ok: false },
      { expected: 2, value: [], ok: false },
      { expected: 2, value: "a", ok: false },
      { expected: 2, value: [1], ok: false },
      { expected: 2, value: "ab", ok: true },
      { expected: 2, value: [1, 2], ok: true },
      { expected: 2, value: "abc", ok: false },
      { expected: 2, value: [1, 2, 3], ok: false },
    ].forEach(({ expected, value, ok }) =>
      it(`exactLength(${expected})(${str(value)}) -> ${
        ok ? "OK" : "ERROR"
      }`, () => {
        const error = `Required length is exactly ${expected}`;
        const validator = validators.exactLength(expected, error);

        expect(validator(value)).toEqual(ok ? null : error);
      })
    );
  });

  describe("minDate", () => {
    const min = new Date("2016-05-24T23:00:00");

    [
      { value: null, ok: false },
      { value: new Date("huh?"), ok: false },
      { value: new Date("2015-05-24T23:00:00"), ok: false },
      { value: new Date("2016-05-24T22:59:59"), ok: false },
      { value: new Date("2016-05-24T23:00:00"), ok: true },
      { value: new Date("2016-05-24T23:01:00"), ok: true },
      { value: new Date("2017-05-24T23:00:00"), ok: true },
    ].forEach(({ value, ok }) =>
      it(`minDate(${min.toDateString()})(${
        value?.toDateString() ?? "null"
      }) -> ${ok ? "OK" : "ERROR"}`, () => {
        const error = `Date must be at least ${min.toLocaleDateString()}`;
        const validator = validators.minDate(min, error);

        expect(validator(value)).toEqual(ok ? null : error);
      })
    );
  });

  describe("maxDate", () => {
    const max = new Date("2016-05-24T23:00:00");

    [
      { value: null, ok: false },
      { value: new Date("huh?"), ok: false },
      { value: new Date("2015-05-24T23:00:00"), ok: true },
      { value: new Date("2016-05-24T22:59:59"), ok: true },
      { value: new Date("2016-05-24T23:00:00"), ok: true },
      { value: new Date("2016-05-24T23:01:00"), ok: false },
      { value: new Date("2017-05-24T23:00:00"), ok: false },
    ].forEach(({ value, ok }) =>
      it(`maxDate(${max.toDateString()})(${
        value?.toDateString() ?? "null"
      }) -> ${ok ? "OK" : "ERROR"}`, () => {
        const error = `Date must be at most ${max.toLocaleDateString()}`;
        const validator = validators.maxDate(max, error);

        expect(validator(value)).toEqual(ok ? null : error);
      })
    );
  });
});
