import { useMemo } from "react";

import { keys, values } from "../../../utils";
import { Atom } from "../../../utils/atoms";
import { Task } from "../../../utils/task";
import { useSubscription } from "../../../utils/use-subscription";
import { useFormtsContext } from "../../context";
import { resolveTouched } from "../../helpers";
import { FormController } from "../../types/form-controller";
import { FormHandle } from "../../types/form-handle";
import { FormSchema } from "../../types/form-schema";
import { impl } from "../../types/type-mapper-util";

/**
 * Hook used to gain access to form-wide methods and properties computed from all fields.
 * Causes the component to subscribe to changes to form state that affect the computed properties.
 *
 * @param Schema - created using `FormSchemaBuilder`, needed for type inference.
 * @param controller - obtained by using `useFormController` hook, used to connect to form state.
 * Injected automatically via React Context when used inside `FormProvider` component.
 *
 * @returns `FormHandle` used to interact with form.
 *
 * @example
 * ```ts
 * const Schema = new FormSchemaBuilder()...;
 *
 * const MyForm: React.FC = () => {
 *   const controller = useFormController({ Schema })
 *   const formHandle = useFormHandle(Schema, controller)
 *
 *   ...
 * }
 * ```
 */
export const useFormHandle = <Values extends object, Err>(
  _Schema: FormSchema<Values, Err>,
  controller?: FormController
): FormHandle<Values, Err> => {
  const { state, methods } = useFormtsContext<Values, Err>(controller);

  const stateAtom = useMemo(
    () =>
      Atom.fuse(
        (
          isTouched,
          isValid,
          isValidating,
          isSubmitting,
          successfulSubmitCount,
          failedSubmitCount
        ) => ({
          isTouched,
          isValid,
          isValidating,
          isSubmitting,
          successfulSubmitCount,
          failedSubmitCount,
        }),
        Atom.fuse(
          (sc, fc, touched) => sc > 0 || fc > 0 || resolveTouched(touched),
          state.successfulSubmitCount,
          state.failedSubmitCount,
          state.touched
        ),
        Atom.fuse(x => values(x).every(err => err == null), state.errors),
        Atom.fuse(x => keys(x).length > 0, state.validating),
        state.isSubmitting,
        state.successfulSubmitCount,
        state.failedSubmitCount
      ),
    [state]
  );

  useSubscription(stateAtom);

  return {
    isSubmitting: stateAtom.val.isSubmitting,

    isTouched: stateAtom.val.isTouched,

    isValid: stateAtom.val.isValid,

    isValidating: stateAtom.val.isValidating,

    get submitCount() {
      const { successfulSubmitCount, failedSubmitCount } = stateAtom.val;

      return {
        valid: successfulSubmitCount,
        invalid: failedSubmitCount,
        total: successfulSubmitCount + failedSubmitCount,
      };
    },

    reset: () => methods.resetForm().runPromise(),

    validate: () => methods.validateForm().runPromise(),

    submit: (onSuccess, onFailure) =>
      methods
        .submitForm(
          values => Task.from(() => onSuccess(values)).map(() => {}),
          errors => Task.from(() => onFailure?.(errors))
        )
        .runPromise(),

    setFieldValue: (field, value) =>
      methods.setFieldValue(field, value).runPromise(),

    setFieldError: (field, error) =>
      methods.setFieldErrors({ path: impl(field).__path, error }).runPromise(),
  };
};
