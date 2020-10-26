import { assert, IsExact } from "conditional-type-checks";

import { FieldDescriptor } from "../types/field-descriptor";
import { FormValidator } from "../types/form-validator";
import { impl } from "../types/type-mapper-util";

import { createFormSchema } from "./create-form-schema";
import { createFormValidator } from "./create-form-validator";

export const wait = <T extends string | null>(value: T): Promise<T> =>
  new Promise(resolve => setTimeout(() => resolve(value), 0));

describe("createFormValidator types", () => {
  const Schema = createFormSchema(
    fields => ({
      string: fields.string(),
      choice: fields.choice("A", "B", "C"),
      num: fields.number(),
      bool: fields.bool(),
    }),
    errors => errors<"err1" | "err2">()
  );

  it("resolves ok", () => {
    const formValidator = createFormValidator(Schema, _validate => []);

    type Actual = typeof formValidator;
    type Expected = FormValidator<
      {
        string: string;
        choice: "A" | "B" | "C";
        num: number | "";
        bool: boolean;
      },
      "err1" | "err2"
    >;

    assert<IsExact<Actual, Expected>>(true);
  });
});

describe("createFormValidator", () => {
  const Schema = createFormSchema(
    fields => ({
      string: fields.string(),
      number: fields.number(),
      choice: fields.choice("A", "B", "C"),
      instance: fields.instanceOf(Date),
      arrayString: fields.array(fields.string()),
      arrayChoice: fields.array(fields.choice("a", "b", "c")),
      arrayArrayString: fields.array(fields.array(fields.string())),
      object: fields.object({ str: fields.string(), num: fields.number() }),
      arrayObjectString: fields.array(fields.object({ str: fields.string() })),
      objectArray: fields.object({
        arrayString: fields.array(fields.string()),
      }),
      objectObjectArrayObjectString: fields.object({
        obj: fields.object({
          array: fields.array(fields.object({ str: fields.string() })),
        }),
      }),
    }),
    error => error<"REQUIRED" | "TOO_SHORT" | "INVALID_VALUE">()
  );

  it("should return ERR for failing single-rule on string field", async () => {
    const stringRequiredValidator = (x: string) => (x ? null : "REQUIRED");
    const { validate } = createFormValidator(Schema, validate => [
      validate({
        field: Schema.string,
        rules: () => [stringRequiredValidator],
      }),
    ]);
    const getValue = () => "" as any;

    const validation = await validate({ fields: [Schema.string], getValue });

    expect(validation).toEqual([{ field: Schema.string, error: "REQUIRED" }]);
  });

  it("should return null for passing single-rule on string field", async () => {
    const stringRequiredValidator = (x: string) => (x ? null : "REQUIRED");
    const { validate } = createFormValidator(Schema, validate => [
      validate({
        field: Schema.string,
        rules: () => [stringRequiredValidator],
      }),
    ]);
    const getValue = () => "defined string" as any;

    const validation = await validate({ fields: [Schema.string], getValue });

    expect(validation).toEqual([{ field: Schema.string, error: null }]);
  });

  it("should return ERR for failing all of multiple-rule on string field", async () => {
    const stringRequiredValidator = (x: string) =>
      x !== "" ? null : "REQUIRED";
    const stringLengthValidator = (x: string) =>
      x.length > 3 ? null : "TOO_SHORT";
    const { validate } = createFormValidator(Schema, validate => [
      validate({
        field: Schema.string,
        rules: () => [stringRequiredValidator, stringLengthValidator],
      }),
    ]);
    const getValue = () => "" as any;

    const validation = await validate({ fields: [Schema.string], getValue });

    expect(validation).toEqual([{ field: Schema.string, error: "REQUIRED" }]);
  });

  it("should return ERR for failing last of multiple-rule on string field", async () => {
    const stringRequiredValidator = (x: string) =>
      x !== "" ? null : "REQUIRED";
    const stringLengthValidator = (x: string) =>
      x.length > 3 ? null : "TOO_SHORT";
    const { validate } = createFormValidator(Schema, validate => [
      validate({
        field: Schema.string,
        rules: () => [stringRequiredValidator, stringLengthValidator],
      }),
    ]);
    const getValue = () => "ab" as any;

    const validation = await validate({ fields: [Schema.string], getValue });

    expect(validation).toEqual([{ field: Schema.string, error: "TOO_SHORT" }]);
  });

  it("should return null for passing all of multiple-rule on string field", async () => {
    const stringRequiredValidator = (x: string) =>
      x !== "" ? null : "REQUIRED";
    const stringLengthValidator = (x: string) =>
      x.length > 3 ? null : "TOO_SHORT";
    const { validate } = createFormValidator(Schema, validate => [
      validate({
        field: Schema.string,
        rules: () => [stringRequiredValidator, stringLengthValidator],
      }),
    ]);
    const getValue = () => "abcd" as any;

    const validation = await validate({ fields: [Schema.string], getValue });

    expect(validation).toEqual([{ field: Schema.string, error: null }]);
  });

  it("should return ERR for failing single-rule on choice field ", async () => {
    const { validate } = createFormValidator(Schema, validate => [
      validate({
        field: Schema.choice,
        rules: () => [x => (x === "A" ? "INVALID_VALUE" : null)],
      }),
    ]);
    const getValue = () => "A" as any;

    const validation = await validate({ fields: [Schema.choice], getValue });

    expect(validation).toEqual([
      { field: Schema.choice, error: "INVALID_VALUE" },
    ]);
  });

  it("should return null for passing single-rule on choice field ", async () => {
    const { validate } = createFormValidator(Schema, validate => [
      validate({
        field: Schema.choice,
        rules: () => [x => (x === "A" ? "INVALID_CHOICE" : null)],
      }),
    ]);
    const getValue = () => "C" as any;

    const validation = await validate({ fields: [Schema.choice], getValue });

    expect(validation).toEqual([{ field: Schema.choice, error: null }]);
  });

  it("should return ERR for failing single-rule on instance field ", async () => {
    const { validate } = createFormValidator(Schema, validate => [
      validate({
        field: Schema.instance,
        rules: () => [x => (x === null ? "REQUIRED" : null)],
      }),
    ]);
    const getValue = () => null as any;

    const validation = await validate({ fields: [Schema.instance], getValue });

    expect(validation).toEqual([{ field: Schema.instance, error: "REQUIRED" }]);
  });

  it("should return ERR for failing multiple-rule on string array field ", async () => {
    const { validate } = createFormValidator(Schema, validate => [
      validate({
        field: Schema.arrayString,
        rules: () => [
          x => (x.length > 3 ? null : "TOO_SHORT"),
          x => (x.some(y => y === "invalid") ? "INVALID_VALUE" : null),
        ],
      }),
    ]);
    const getValue = () => ["ok", "very-ok", "invalid", "still-ok"] as any;

    const validation = await validate({
      fields: [Schema.arrayString],
      getValue,
    });

    expect(validation).toEqual([
      { field: Schema.arrayString, error: "INVALID_VALUE" },
    ]);
  });

  it("should return null for passing single-rule on string array array field ", async () => {
    const { validate } = createFormValidator(Schema, validate => [
      validate({
        field: Schema.arrayArrayString,
        rules: () => [x => (x.length > 3 ? null : "TOO_SHORT")],
      }),
    ]);
    const getValue = () =>
      [["ok"], ["very-ok"], ["invalid"], ["still-ok"]] as any;

    const validation = await validate({
      fields: [Schema.arrayArrayString],
      getValue,
    });

    expect(validation).toEqual([
      { field: Schema.arrayArrayString, error: null },
    ]);
  });

  it("should return ERR for failing async single-rule on object field ", async () => {
    const { validate } = createFormValidator(Schema, validate => [
      validate({
        field: Schema.object,
        rules: () => [() => wait("INVALID_VALUE")],
      }),
    ]);
    const getValue = () => null as any;

    const validation = await validate({ fields: [Schema.object], getValue });

    expect(validation).toEqual([
      { field: Schema.object, error: "INVALID_VALUE" },
    ]);
  });

  it("should return ERR for failing async multi-rule on object field ", async () => {
    const { validate } = createFormValidator(Schema, validate => [
      validate({
        field: Schema.object,
        rules: () => [() => wait(null), () => wait("REQUIRED")],
      }),
    ]);
    const getValue = () => null as any;

    const validation = await validate({ fields: [Schema.object], getValue });

    expect(validation).toEqual([{ field: Schema.object, error: "REQUIRED" }]);
  });

  it("should return null for passing async multi-rule on object field ", async () => {
    const { validate } = createFormValidator(Schema, validate => [
      validate({
        field: Schema.object,
        rules: () => [() => wait(null), () => wait(null)],
      }),
    ]);
    const getValue = () => null as any;

    const validation = await validate({ fields: [Schema.object], getValue });

    expect(validation).toEqual([{ field: Schema.object, error: null }]);
  });

  it("validate.each should run for each element of list", async () => {
    const { validate } = createFormValidator(Schema, validate => [
      validate.each({
        field: Schema.arrayObjectString,
        rules: () => [
          x => wait(x.str === "invalid" ? "INVALID_VALUE" : null),
          x => (x.str === "" ? "REQUIRED" : null),
          x => wait(x.str?.length < 3 ? "TOO_SHORT" : null),
        ],
      }),
    ]);
    const getValue = (field: FieldDescriptor<any>): any => {
      switch (impl(field).__path) {
        case "arrayObjectString[0]":
          return { str: "sm" };
        case "arrayObjectString[1]":
          return { str: "" };
        case "arrayObjectString[2]":
          return { str: "valid string" };
        case "arrayObjectString[3]":
          return { str: "invalid" };
      }
    };

    const validation = await validate({
      fields: [
        Schema.arrayObjectString.nth(0),
        Schema.arrayObjectString.nth(1),
        Schema.arrayObjectString.nth(2),
        Schema.arrayObjectString.nth(3),
      ],
      getValue,
    });

    expect(validation).toEqual([
      { field: Schema.arrayObjectString.nth(0), error: "TOO_SHORT" },
      { field: Schema.arrayObjectString.nth(1), error: "REQUIRED" },
      { field: Schema.arrayObjectString.nth(2), error: null },
      { field: Schema.arrayObjectString.nth(3), error: "INVALID_VALUE" },
    ]);
  });

  it("validate.each for multiple arrays should run for each element of corresponding list", async () => {
    const { validate } = createFormValidator(Schema, validate => [
      validate.each({
        field: Schema.arrayObjectString,
        rules: () => [x => wait(x.str?.length < 3 ? "TOO_SHORT" : null)],
      }),
      validate.each({
        field: Schema.arrayChoice,
        rules: () => [x => wait(x === "c" ? "INVALID_VALUE" : null)],
      }),
    ]);
    const getValue = (field: FieldDescriptor<any>): any => {
      switch (impl(field).__path) {
        case "arrayObjectString[0]":
          return { str: "ok-string" };
        case "arrayObjectString[1]":
          return { str: "" };

        case "arrayChoice[0]":
          return "c";
        case "arrayChoice[1]":
          return "a";
      }
    };

    const validation = await validate({
      fields: [
        Schema.arrayChoice.nth(1),
        Schema.arrayChoice.nth(0),
        Schema.arrayObjectString.nth(0),
        Schema.arrayObjectString.nth(1),
      ],
      getValue,
    });

    expect(validation).toEqual([
      { field: Schema.arrayChoice.nth(1), error: null },
      { field: Schema.arrayChoice.nth(0), error: "INVALID_VALUE" },
      { field: Schema.arrayObjectString.nth(0), error: null },
      { field: Schema.arrayObjectString.nth(1), error: "TOO_SHORT" },
    ]);
  });

  it("validation should run depending if corresponding trigger is present in builder", async () => {
    const { validate } = createFormValidator(Schema, validate => [
      validate({
        field: Schema.string,
        rules: () => [x => (x ? null : "REQUIRED")],
        triggers: ["blur", "submit"],
      }),
      validate({
        field: Schema.choice,
        rules: () => [x => (x ? null : "REQUIRED")],
        triggers: ["change", "submit"],
      }),
    ]);
    const getValue = (field: FieldDescriptor<any>): any => {
      switch (impl(field).__path) {
        case "string":
          return "";
        case "choice":
          return "";
      }
    };

    const validation = await validate({
      fields: [Schema.string, Schema.choice],
      getValue,
      trigger: "change",
    });

    expect(validation).toEqual([{ field: Schema.choice, error: "REQUIRED" }]);
  });

  it("validation is not making redundant calls", async () => {
    const stringRequired = jest.fn((x: string) => (x ? null : "REQUIRED"));
    const stringLength = jest.fn((x: string) =>
      x.length < 3 ? "TOO_SHORT" : null
    );
    const numberRequired = jest.fn((x: number | "") =>
      wait(x ? null : "REQUIRED")
    );
    const numberValue = jest.fn((x: number | "") =>
      wait(x < 18 ? "TOO_SHORT" : null)
    );

    const choiceCheck = jest.fn((x: "A" | "B" | "C") =>
      x === "C" ? "INVALID_VALUE" : null
    );

    const arrayCheck = jest.fn((x: string[]) =>
      x === [] ? "TOO_SHORT" : null
    );

    const { validate } = createFormValidator(Schema, validate => [
      validate({
        field: Schema.string,
        rules: () => [stringRequired, stringLength],
        triggers: ["blur", "submit", "change"],
      }),
      validate({
        field: Schema.number,
        rules: () => [numberRequired, numberValue],
        triggers: ["change", "submit"],
      }),
      validate({
        field: Schema.choice,
        rules: () => [choiceCheck],
        triggers: ["submit"],
      }),
      validate({
        field: Schema.arrayString,
        rules: () => [arrayCheck],
        triggers: ["submit", "change", "blur"],
      }),
    ]);

    const getValue = (field: FieldDescriptor<any>): any => {
      switch (impl(field).__path) {
        case "string":
          return "ab";
        case "number":
          return "";
        case "choice":
          return "A";
        case "arrayString":
          return [];
      }
    };

    const validation = await validate({
      fields: [Schema.string, Schema.number, Schema.choice],
      getValue,
      trigger: "change",
    });

    expect(validation).toEqual([
      { field: Schema.string, error: "TOO_SHORT" },
      { field: Schema.number, error: "REQUIRED" },
    ]);

    expect(stringRequired).toHaveBeenCalledTimes(1);
    expect(stringLength).toHaveBeenCalledTimes(1);

    expect(numberRequired).toHaveBeenCalledTimes(1);
    // previous rule exited with error
    expect(numberValue).not.toHaveBeenCalled();

    // change trigger not included in builder
    expect(choiceCheck).not.toHaveBeenCalled();

    // arrayString was not passed for validation
    expect(arrayCheck).not.toHaveBeenCalled();
  });

  it("worked when passed multiple validators for same field", async () => {
    const { validate } = createFormValidator(Schema, validate => [
      validate({
        field: Schema.string,
        rules: () => [x => (x === "" ? "INVALID_VALUE" : null)],
      }),
      validate({
        field: Schema.string,
        rules: () => [x => (x.length < 3 ? "TOO_SHORT" : null)],
      }),
      validate.each({
        field: Schema.arrayString,
        rules: () => [x => wait(x.length < 3 ? "TOO_SHORT" : null)],
      }),
      validate({
        field: Schema.arrayString.nth(0),
        rules: () => [x => wait(x === "invalid" ? "INVALID_VALUE" : null)],
      }),
    ]);
    const getValue = (field: FieldDescriptor<any>): any => {
      switch (impl(field).__path) {
        case "arrayString[0]":
          return "invalid";
        case "arrayString[1]":
          return "invalid";
        case "arrayString[2]":
          return "";
        case "string":
          return "ab";
      }
    };

    const result = await validate({
      fields: [
        Schema.arrayString.nth(0),
        Schema.arrayString.nth(1),
        Schema.arrayString.nth(2),
        Schema.string,
      ],
      getValue,
    });

    expect(result).toEqual([
      { field: Schema.arrayString.nth(0), error: "INVALID_VALUE" },
      { field: Schema.arrayString.nth(1), error: null },
      { field: Schema.arrayString.nth(2), error: "TOO_SHORT" },
      { field: Schema.string, error: "TOO_SHORT" },
    ]);
  });

  it("calls callback functions to signal start and end of validation for every affected field", async () => {
    const pass = <T>(_val: T) => wait(null);

    const { validate } = createFormValidator(Schema, validate => [
      validate({
        field: Schema.string,
        rules: () => [pass],
      }),
      validate({
        field: Schema.string,
        rules: () => [pass],
      }),
      validate.each({
        field: Schema.arrayString,
        rules: () => [pass],
      }),
      validate({
        field: Schema.arrayString.nth(0),
        rules: () => [pass],
      }),
    ]);

    const onFieldValidationStart = jest.fn();
    const onFieldValidationEnd = jest.fn();

    const fields = [
      Schema.number,
      Schema.arrayString.nth(0),
      Schema.arrayString.nth(1),
      Schema.arrayString.nth(2),
      Schema.string,
    ];

    await validate({
      fields,
      getValue: () => "foo" as any,
      onFieldValidationStart,
      onFieldValidationEnd,
    });

    const expectField = (desc: FieldDescriptor<any>) =>
      expect.objectContaining({ __path: impl(desc).__path });

    expect(onFieldValidationStart).toHaveBeenCalledWith(
      expectField(Schema.arrayString.nth(0))
    );
    expect(onFieldValidationStart).toHaveBeenCalledWith(
      expectField(Schema.arrayString.nth(1))
    );
    expect(onFieldValidationStart).toHaveBeenCalledWith(
      expectField(Schema.arrayString.nth(2))
    );
    expect(onFieldValidationStart).toHaveBeenCalledWith(
      expectField(Schema.string)
    );
    expect(onFieldValidationStart).not.toHaveBeenCalledWith(
      expectField(Schema.number)
    );
    expect(onFieldValidationStart).not.toHaveBeenCalledWith(
      expectField(Schema.arrayString)
    );

    expect(onFieldValidationEnd).toHaveBeenCalledWith(
      expectField(Schema.arrayString.nth(0))
    );
    expect(onFieldValidationEnd).toHaveBeenCalledWith(
      expectField(Schema.arrayString.nth(1))
    );
    expect(onFieldValidationEnd).toHaveBeenCalledWith(
      expectField(Schema.arrayString.nth(2))
    );
    expect(onFieldValidationEnd).toHaveBeenCalledWith(
      expectField(Schema.string)
    );
    expect(onFieldValidationEnd).not.toHaveBeenCalledWith(
      expectField(Schema.number)
    );
    expect(onFieldValidationEnd).not.toHaveBeenCalledWith(
      expectField(Schema.arrayString)
    );
  });
});