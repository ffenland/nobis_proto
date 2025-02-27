import { useFormStatus } from "react-dom";

export interface FormButtonProps {
  text: string;
  cssName: string;
}

const FormButton = ({ text, cssName }: FormButtonProps) => {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} type="submit" className={`btn ${cssName}`}>
      {pending ? (
        <span className="loading loading-ring loading-md"></span>
      ) : (
        <span>{text}</span>
      )}
    </button>
  );
};

export default FormButton;
