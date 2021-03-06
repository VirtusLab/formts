import { impl } from "../types/type-mapper-util";

import { array } from "./array";
import { number } from "./number";
import { string } from "./string";

describe("array decoder", () => {
  it("should provide it's field type", () => {
    const decoder = impl(array(string()));

    expect(decoder.fieldType).toBe("array");
  });

  it("should provide initial field value", () => {
    const decoder = impl(array(string()));

    expect(decoder.init()).toEqual([]);
  });

  it("should expose inner decoder", () => {
    const inner = number();
    const decoder = impl(array(inner));

    expect(decoder.inner).toBe(inner);
  });

  describe("combined with string decoder", () => {
    it("should decode empty arrays", () => {
      const decoder = impl(array(string()));

      expect(decoder.decode([])).toEqual({ ok: true, value: [] });
    });

    it("should decode string array", () => {
      const decoder = impl(array(string()));
      const value = ["foo", "bar", "baz", ""];

      expect(decoder.decode(value)).toEqual({ ok: true, value });
    });

    it("should NOT decode mixed array", () => {
      const decoder = impl(array(string()));
      const value = [null, "foo", 42, "", []];

      expect(decoder.decode(value)).toEqual({ ok: false });
    });
  });

  describe("combined with number decoder", () => {
    it("should decode empty arrays", () => {
      const decoder = impl(array(number()));

      expect(decoder.decode([])).toEqual({ ok: true, value: [] });
    });

    it("should decode number array", () => {
      const decoder = impl(array(number()));
      const value = [-1, 0, 10, 66.6];

      expect(decoder.decode(value)).toEqual({ ok: true, value });
    });

    it("should NOT decode mixed array", () => {
      const decoder = impl(array(string()));
      const value = [null, "foo", 42, "", []];

      expect(decoder.decode(value)).toEqual({ ok: false });
    });
  });

  describe("combined with another array decoder", () => {
    it("should decode empty arrays", () => {
      const decoder = impl(array(array(string())));

      expect(decoder.decode([])).toEqual({ ok: true, value: [] });
      expect(decoder.decode([[]])).toEqual({ ok: true, value: [[]] });
    });

    it("should decode nested string array", () => {
      const decoder = impl(array(array(string())));
      const value = [["", "foobar"], [], ["?"]];

      expect(decoder.decode(value)).toEqual({ ok: true, value });
    });

    it("should NOT decode mixed array", () => {
      const decoder = impl(array(string()));
      const value = [null, "foo", 42, "", []];

      expect(decoder.decode(value)).toEqual({ ok: false });
    });
  });
});
