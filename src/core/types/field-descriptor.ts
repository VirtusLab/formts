import { Nominal } from "../../utils";

import { FieldDecoder } from "./field-decoder";

// actual type, encapsulated away from public API
export type _FieldDescriptorImpl<T> = {
  path: string;
} & FieldDecoder<T>;

/**
 * Pointer to a form field.
 * Used to interact with Formts API via `useField` hook.
 */
export interface FieldDescriptor<T, Err = unknown>
  extends Nominal<"FieldDescriptor", { __ref?: [T, Err] }> {}
