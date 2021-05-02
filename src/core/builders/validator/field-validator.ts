import { Falsy, NoInfer } from "../../../utils";
import { GenericFieldDescriptor } from "../../types/field-descriptor";
import {
  createRegexForTemplate,
  GenericFieldTemplate,
  pathIsTemplate,
} from "../../types/field-template";
import {
  FieldPath,
  ValidationTrigger,
  Validator,
} from "../../types/form-validator";
import { impl } from "../../types/type-mapper-util";

export type FieldValidator<T, Err, Dependencies extends any[]> = {
  id: string;
  path: FieldPath;
  triggers?: Array<ValidationTrigger>;
  validators: (...deps: [...Dependencies]) => Array<Falsy | Validator<T, Err>>;
  dependencies?: readonly [...FieldDescTuple<Dependencies, Err>];
  debounce?: number;
  regex?: RegExp;
};

export type CreateFieldValidatorFn = {
  <T, Err, Dependencies extends any[]>(
    config: ValidateConfig<T, Err, Dependencies>
  ): FieldValidator<T, Err, Dependencies>;

  <T, Err>(
    field: ValidationFieldPointer<T, Err>,
    ...rules: Array<Validator<T, NoInfer<Err>>>
  ): FieldValidator<T, Err, []>;
};

export type ValidateConfig<T, Err, Dependencies extends any[]> = {
  /**
     * Pointer to the field to be validated.
     * If the field is an array field descriptor then validation rules will be run for the entire array,
     * but if it is it's `nth` function, validation rules will be run for each item individually.
     * 
     * @example
     * 
     * ```ts
        createFormValidator(Schema, validate => [
          validate({
            field: Schema.stringField,
            rules: () => [(_val: string) => "error!"],
          }),
          validate({
            field: Schema.stringArrayField,
            rules: () => [(_arr: Array<string>) => "error!"],
          }),
          validate({
            field: Schema.stringArrayField.nth,
            rules: () => [(_item: string) => "error!"],
          }),
        ]);
     * ```
     */
  field: ValidationFieldPointer<T, Err>;

  /**
   * If specified, will restrict running validation rules to only when caused by appropriate events.
   * Imperatively invoked validation will always run, regardless of triggers.
   */
  triggers?: ValidationTrigger[];

  /**
     * If specified:
     *  - will inject respective dependency fields' values into `rules` function for usage in validation
     *  - changes to any of the dependencies will cause validation of this field (respecting trigger rules if present)
     * 
     * @example
     * 
     * ```ts
        createFormValidator(Schema, validate => [
          validate({
            field: Schema.passwordConfirm,
            dependencies: [Schema.password]
            rules: (password) => [val => val !== password ? "error!" : null],
          }),
        ]);
     * ```
     */
  dependencies?: readonly [...FieldDescTuple<Dependencies, Err>];

  /**
   * If specified, will wait provided amount of milliseconds before running validation rules.
   * If validation for the field is run again in that time, timer is reset.
   * Use this to limit number of invocations of expensive validation rules (e.g. async server calls).
   * Note: this will affect all downstream validation rules for the field.
   */
  debounce?: number;

  /**
     * Function receiving value of fields specified in `dependencies` prop and returning validation rules.
     * Validation rules are functions receiving field value and returning `Err` or null.
     * You can also pass `false | null | undefined` in place of validator function - it will be ignored. 
     * 
     * @example
     * 
     * ```ts
        createFormValidator(Schema, validate => [
          validate({
            field: Schema.parentsConsent,
            dependencies: [Schema.age]
            rules: (age) => [age < 18 && required("Field us required!")],
          }),
        ]);
     * ```
     */
  rules: (
    ...deps: [...Dependencies]
  ) => Array<Falsy | Validator<T, NoInfer<Err>>>;
};

export type ValidationFieldPointer<T, Err> =
  | GenericFieldDescriptor<T, Err>
  | GenericFieldTemplate<T, Err>;

export type FieldDescTuple<ValuesTuple extends readonly any[], Err> = {
  [Index in keyof ValuesTuple]: GenericFieldDescriptor<ValuesTuple[Index], Err>;
};

export const createFieldValidator: CreateFieldValidatorFn = <
  T,
  Err,
  Deps extends any[]
>(
  x: ValidateConfig<T, Err, Deps> | ValidationFieldPointer<T, Err>,
  ...rules: Array<Validator<T, Err>>
): FieldValidator<T, Err, Deps> => {
  const config: ValidateConfig<T, Err, Deps> =
    (x as any)["field"] != null
      ? { ...(x as ValidateConfig<T, Err, Deps>) }
      : { field: x as ValidationFieldPointer<T, Err>, rules: () => rules };

  const path = impl(config.field).__path;
  const regex = pathIsTemplate(path) ? createRegexForTemplate(path) : undefined;

  return {
    id: getUuid(),
    path,
    regex,
    triggers: config.triggers,
    validators: config.rules,
    dependencies: config.dependencies,
    debounce: config.debounce,
  };
};

const getUuid = (() => {
  let index = 0;
  return () => (index++).toString();
})();
