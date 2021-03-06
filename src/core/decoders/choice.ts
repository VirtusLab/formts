import {
  FieldDecoder,
  _ChoiceFieldDecoderImpl,
  _FieldDecoderImpl,
} from "../types/field-decoder";
import { opaque } from "../types/type-mapper-util";

/**
 * Define field of given string literal union type.
 * Default initial value will be first option received.
 * Accepts string and number values which are present on provided options list.
 *
 * **requires at least one option to be provided**
 *
 * @example
 * ```
 * const Schema = new FormSchemaBuilder()
 *  .fields({
 *    x: FormFields.choice("A", "B", "C") // x: "A" | "B" | "C"
 *  })
 *  .build()
 * ```
 */
export const choice = <Opts extends string>(
  firstOption: Opts,
  ...otherOptions: Opts[]
): FieldDecoder<Opts> => {
  const options = [firstOption, ...otherOptions];

  const optionsDictionary = options.reduce<Record<string, Opts | undefined>>(
    (dict, opt) => {
      dict[opt] = opt;
      return dict;
    },
    {}
  );

  const decoder: _ChoiceFieldDecoderImpl<Opts> = {
    options,

    fieldType: "choice",

    init: () => firstOption,

    decode: value => {
      switch (typeof value) {
        case "string": {
          const option = optionsDictionary[value];
          return option != null ? { ok: true, value: option } : { ok: false };
        }
        case "number": {
          if (Number.isFinite(value)) {
            const option = optionsDictionary[value.toString()];
            return option != null ? { ok: true, value: option } : { ok: false };
          } else {
            return { ok: false };
          }
        }
        default:
          return { ok: false };
      }
    },
  };

  return opaque(decoder as _FieldDecoderImpl<Opts>);
};
