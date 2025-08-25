// En tu página
import FibeMultiStepForm from "./FibeMultiStepForm";
import "./FibePage.css";

export default function Page() {
  return (
    <FibeMultiStepForm  onSubmit={(payload) => {
      // Luego conectas con tu backend (fetch/axios)
      console.log("Payload final:", payload);
    }} />
  );
}
