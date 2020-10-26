import { Falsy } from "../../utils";

import {
  ArrayFieldDescriptor,
  FieldDescriptor,
  GenericFieldDescriptor,
} from "./field-descriptor";

/**
 * Function responsible for validating single field.
 *
 * @param value - value to be validated of type `T`
 *
 * @returns validation error of type `Err`, or `null` when field is valid
 */
export type Validator<T, Err> = ValidatorSync<T, Err> | ValidatorAsync<T, Err>;

export type ValidatorSync<T, Err> = (value: T) => Err | null;

export type ValidatorAsync<T, Err> = (value: T) => Promise<Err | null>;

export type ValidationTrigger = "change" | "blur" | "submit";

export type ValidationResult<Err> = Array<{
  field: FieldDescriptor<unknown, Err>;
  error: Err | null;
}>;

export type ValidateIn<Err> = {
  fields: Array<FieldDescriptor<unknown, Err>>;
  trigger?: ValidationTrigger;
  getValue: <P>(field: FieldDescriptor<P, Err>) => P;
  onFieldValidationStart?: (field: FieldDescriptor<unknown, Err>) => void;
  onFieldValidationEnd?: (field: FieldDescriptor<unknown, Err>) => void;
};

// @ts-ignore
export type FormValidator<Values extends object, Err> = {
  validate: (input: ValidateIn<Err>) => Promise<ValidationResult<Err>>;
};

export type FieldValidator<T, Err, Dependencies extends any[]> = {
  type: "field" | "each";
  field: FieldDescriptor<T, Err>;
  triggers?: Array<ValidationTrigger>;
  validators: (...deps: [...Dependencies]) => Array<Falsy | Validator<T, Err>>;
  dependencies?: readonly [...FieldDescTuple<Dependencies>];
};

export type ValidateFn = {
  each: ValidateEachFn;

  <T, Err, Dependencies extends any[]>(config: {
    field: GenericFieldDescriptor<T, Err>;
    triggers?: ValidationTrigger[];
    dependencies?: readonly [...FieldDescTuple<Dependencies>];
    rules: (...deps: [...Dependencies]) => Array<Falsy | Validator<T, Err>>;
  }): FieldValidator<T, Err, Dependencies>;
};

export type ValidateEachFn = <T, Err, Dependencies extends any[]>(config: {
  field: ArrayFieldDescriptor<T[], Err>;
  triggers?: ValidationTrigger[];
  dependencies?: readonly [...FieldDescTuple<Dependencies>];
  rules: (...deps: [...Dependencies]) => Array<Falsy | Validator<T, Err>>;
}) => FieldValidator<T, Err, Dependencies>;

type FieldDescTuple<ValuesTuple extends readonly any[]> = {
  [Index in keyof ValuesTuple]: GenericFieldDescriptor<ValuesTuple[Index]>;
};