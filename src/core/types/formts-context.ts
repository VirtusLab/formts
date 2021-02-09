import { ChangeEvent } from "react";

import type {
  FieldStateAtomCache,
  FieldDependenciesAtomCache,
} from "../hooks/use-form-controller/atom-cache";

import { FieldDescriptor } from "./field-descriptor";
import { FieldError } from "./form-handle";
import { ValidationResult, ValidationTrigger } from "./form-validator";
import { FormtsOptions } from "./formts-options";
import { FormtsAtomState } from "./formts-state";

export type FormSubmissionResult<Values extends object, Err> =
  | { ok: true; values: Values }
  | { ok: false; errors: Array<FieldError<Err>> };

export type InternalFormtsMethods<Values extends object, Err> = {
  validateField: <T>(
    field: FieldDescriptor<T, Err>,
    trigger?: ValidationTrigger
  ) => Promise<void>;
  validateForm: () => Promise<ValidationResult<Err>>;
  setFieldValue: <T>(field: FieldDescriptor<T, Err>, value: T) => Promise<void>;
  setFieldValueFromEvent: <T>(
    field: FieldDescriptor<T, Err>,
    event: ChangeEvent<unknown>
  ) => Promise<void>;
  touchField: <T>(field: FieldDescriptor<T, Err>) => void;
  setFieldErrors: (...fields: ValidationResult<Err>) => void;
  resetForm: () => void;
  submitForm: () => Promise<FormSubmissionResult<Values, Err>>;
};

// internal context consumed by hooks
export type InternalFormtsContext<Values extends object, Err> = {
  options: FormtsOptions<Values, Err>;
  state: FormtsAtomState<Values, Err>;
  methods: InternalFormtsMethods<Values, Err>;
  fieldStateCache: FieldStateAtomCache<Values, Err>;
  fieldDependenciesCache: FieldDependenciesAtomCache<Values, Err>;
};
