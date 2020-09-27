import { assertNever } from "../../utils";
import {
  bool,
  string,
  number,
  choice,
  instanceOf,
  array,
  object,
} from "../decoders";
import { FieldDecoder, _FieldDecoderImpl } from "../types/field-decoder";
import { _FieldDescriptorImpl } from "../types/field-descriptor";
import { FormSchema } from "../types/form-schema";
import { impl } from "../types/type-mapper-util";

const Decoders = {
  bool,
  string,
  number,
  choice,
  instanceOf,
  array,
  object,
};

type BuilderFn<V> = (fields: typeof Decoders) => DecodersMap<V>;

type DecodersMap<O> = { [K in keyof O]: FieldDecoder<O[K]> };

type ErrorsMarker<Err> = (errors: <Err>() => Err) => Err;

// loose typing for helping with internal impl, as working with generic target types is impossible
type _FormSchemaApprox_ = Record<string, _DescriptorApprox_>;

type _DescriptorApprox_ =
  | _FieldDescriptorImpl<any>
  | {
      readonly root: _FieldDescriptorImpl<any>;
      readonly nth: (index: number) => _DescriptorApprox_;
    }
  | {
      readonly root: _FieldDescriptorImpl<any>;
      [prop: string]: _FieldDescriptorImpl<any>;
    };

/**
 * Define shape of the form values and type of validation errors.
 * This is used not only for compile-time type-safety but also for runtime validation of form values.
 * The schema can be defined top-level, so that it can be exported to nested Form components for usage together with `useField` hook.
 *
 * @returns
 * FormSchema - used to interact with Formts API and point to specific form fields
 *
 * @example
 * ```
 * const Schema = createForm.schema(
 *   fields => ({
 *     name: fields.string(),
 *     age: fields.number(),
 *   }),
 *   errors => errors<string>()
 * );
 * ```
 */
export const createFormSchema = <Values extends object, Err = never>(
  fields: BuilderFn<Values>,
  _errors?: ErrorsMarker<Err>
): FormSchema<Values, Err> => createObjectSchema(fields(Decoders)) as any;

const createObjectSchema = <O>(decodersMap: DecodersMap<O>, path?: string) => {
  return Object.keys(decodersMap).reduce<_FormSchemaApprox_>((schema, key) => {
    const decoder = decodersMap[key as keyof O];
    schema[key] = createFieldDescriptor(
      impl(decoder) as _FieldDecoderImpl<any>,
      path ? `${path}.${key}` : key
    );
    return schema;
  }, {});
};

const createFieldDescriptor = (
  decoder: _FieldDecoderImpl<any>,
  path: string
): _DescriptorApprox_ => {
  switch (decoder.fieldType) {
    case "bool":
    case "number":
    case "string":
    case "class":
    case "choice":
      return { ...decoder, path };

    case "array": {
      const root = { ...decoder, path };
      const nth = (i: number) =>
        createFieldDescriptor(
          decoder.inner as _FieldDecoderImpl<any>,
          `${path}[${i}]`
        );

      return { root, nth };
    }

    case "object": {
      const root = { ...decoder, path };
      const props = createObjectSchema(
        decoder.inner as DecodersMap<object>,
        path
      );
      return { root, ...props };
    }

    default:
      return assertNever(decoder.fieldType);
  }
};