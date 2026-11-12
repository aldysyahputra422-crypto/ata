import { CircleAlert } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  /** render prop receives the ids to wire label/description to the control */
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => React.ReactNode;
};

/** Label + control + hint/error. Errors are always icon + words, never colour alone. */
export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {children({ id, describedBy, invalid: !!error })}
      {error ? (
        <p className="field__error" id={`${id}-err`} role="alert">
          <CircleAlert aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cn("input", className)} />;
}

export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cn("input", className)} />;
}
